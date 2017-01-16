import assert from 'assert'
const format = x => JSON.stringify(x, null, 2)

export function defaultCheckArgs (actualList, expectedList) {
  if (actualList.length !== expectedList.length) return false
  return expectedList.every((expected, index) => (
    actualList[index] === expected
  ))
}

export function defaultCheckResult (actual, expected) {
  return actual === expected
}

export function defaultTestUnit (title, func) {
  func()
}

export function validateUsagesMatches (methodName, args, matches) {
  if (matches.length > 1) {
    // error: conflicting method uses
    const displayArgs = format(args)
    const conflicts = matches
      .map(({name}, index) => name || `[index ${index}]`)
      .join(', ')
    assert(
      matches.length < 2,
      `Method "${methodName}" has multiple uses for ${displayArgs}; see ${conflicts}`
    )
  }

  if (matches.length !== 1) {
    // error: no matching uses
    const displayArgs = format(args)
    assert(
      matches.length === 1,
      `Method "${methodName}" has no matching use for ${displayArgs}`
    )
  }
}

export class ColtonConsumerError {
  static wrap (func) {
    try {
      func()
    } catch (error) {
      throw new ColtonConsumerError(error)
    }
  }

  constructor (rawError) {
    this.name = 'ColtonConsumerError'
    this.message = rawError.message
    this._error = rawError
  }

  getError () {
    return this._error
  }
}

export function getUsageResponse (usage) {
  const replies = ['throws', 'resolves', 'rejects']
  for (const key in replies) {
    const reply = replies[key]
    if (usage.hasOwnProperty(reply)) {
      return {reply, result: usage[reply]}
    }
  }
  return {reply: 'returns', result: usage.returns}
}

export function provideMethods (methods) {
  function providerMethod (methodName, uses) {
    return function _providerMethod (...inputArgs) {
      const matches = uses.filter(({self, args, checkArgs = defaultCheckArgs}) => {
        const isSelf = self === undefined || self === this
        const isArgs = checkArgs(inputArgs, args)
        return isSelf && isArgs
      })

      ColtonConsumerError.wrap(() => (
        validateUsagesMatches(methodName, inputArgs, matches)
      ))

      const [match] = matches
      const {reply, result} = getUsageResponse(match)
      switch (reply) {
        case 'throws': throw result
        case 'resolves': return Promise.resolve(result)
        case 'reject': return Promise.reject(result)
        default: return result
      }
    }
  }

  const providerMethods = {}
  for (const key in methods) {
    if (!methods.hasOwnProperty(key)) continue
    providerMethods[key] = providerMethod(key, methods[key])
  }
  return providerMethods
}

export function testProviderValues (test, provider, values) {
  for (const key in values) {
    if (!values.hasOwnProperty(key)) continue
    test(`Provider value "${key}" should conform to the contract value`, () => {
      assert(provider[key] === values[key])
    })
  }
}

export function testProviderMethods (test, provider, methods) {
  for (const key in methods) {
    if (!methods.hasOwnProperty(key)) continue
    methods[key].forEach((use, index) => {
      const {
        name,
        self = provider,
        args,
        checkResult = defaultCheckResult
      } = use

      const fail = message => assert.fail(null, null, message, null)
      const {reply, result: expected} = getUsageResponse(use)
      const label = `${key}${name ? `.${name}` : `[${index}]`}`
      const title = verb => (
        `Contract: usage "${label}" should ${verb} the correct result`
      )

      if (reply === 'returns') {
        test(title('return'), () => {
          assert(checkResult(provider[key].apply(self, args), expected))
        })
      }

      if (reply === 'throws') {
        test(title('throw'), () => {
          let value
          try {
            value = provider[key].apply(self, args)
          } catch (error) {
            assert(checkResult(error, expected))
          }
          const result = format(value)
          fail(`Usage "${label}" returned ${result} instead of throwing`)
        })
      }

      if (reply === 'resolves') {
        test(title('resolve with'), () => {
          return provider[key].apply(self, args).then(
            value => assert(checkResult(value, expected)),
            reason => fail(`Usage "${label}" rejected instead of resolving`)
          )
        })
      }

      if (reply === 'rejects') {
        test(title('reject with'), () => {
          return provider[key].apply(self, args).then(
            value => fail(`Usage "${label}" resolved instead of rejecting`),
            reason => assert(checkResult(reason, expected))
          )
        })
      }
    })
  }
}

export function raise (error) {
  if (error instanceof ColtonConsumerError) {
    throw error.getError()
  }
}

export function provide (contract) {
  const {values, methods} = contract
  return {
    ...values,
    ...provideMethods(methods)
  }
}

export function consume (contract, provider, test = defaultTestUnit) {
  const {values, methods} = contract
  testProviderValues(test, provider, values)
  testProviderMethods(test, provider, methods)
}
