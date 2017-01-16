import test from 'ava'
import colton from '../src'
import {
  ColtonConsumerError,
  raise,

  defaultCheckArgs,
  validateUsagesMatches,
  getUsageResponse,
  provideMethods,
  provide,

  defaultCheckResult,
  defaultTestUnit,
  testProviderValues,
  testProviderMethods,
  consume
} from '../src/testing'

test('ColtonConsumerError.wrap() should capture an error', t => {
  const rawError = {}
  const error = new ColtonConsumerError(rawError)
  t.is(error.getError(), rawError)
})

test('raise() should only re-throw ColtonConsumerErrors', t => {
  t.throws(() => {
    try {
      throw new ColtonConsumerError('value')
    } catch (error) {
      raise(error)
    }
  })

  t.notThrows(() => {
    try {
      throw new Error('value')
    } catch (error) {
      raise(error)
    }
  })
})

test('defaultCheckArgs() strictly checks every actual/expected pair', t => {
  {
    const actual = [1, 2, 3]
    const expected = [1, 2, 3]
    t.true(defaultCheckArgs(actual, expected))
  }

  {
    const actual = [1, 2, 3]
    const expected = actual
    t.true(defaultCheckArgs(actual, expected))
  }

  {
    const actual = [1, 2, 3, 4]
    const expected = [1, 2, 3]
    t.false(defaultCheckArgs(actual, expected))
  }

  {
    const actual = [1, 2, 3]
    const expected = [1, 2, 3, 4]
    t.false(defaultCheckArgs(actual, expected))
  }
})

test('validateUsagesMatches() should throw if there is not exactly one match', t => {
  const methodName = 'foo'
  const args = ['bar']
  t.notThrows(() => validateUsagesMatches(methodName, args, [1]))
  t.throws(() => validateUsagesMatches(methodName, args, []))
  t.throws(() => validateUsagesMatches(methodName, args, [1, 2]))
})

test('getUsageResponse() returns the correct reply and result', t => {
  const returning = {returns: 'foo'}
  t.deepEqual(getUsageResponse(returning), {reply: 'returns', result: 'foo'})

  const throwing = {throws: 'foo'}
  t.deepEqual(getUsageResponse(throwing), {reply: 'throws', result: 'foo'})

  const resolving = {resolves: 'foo'}
  t.deepEqual(getUsageResponse(resolving), {reply: 'resolves', result: 'foo'})

  const rejecting = {rejects: 'foo'}
  t.deepEqual(getUsageResponse(rejecting), {reply: 'rejects', result: 'foo'})
})

test('providerMethods() returns the method mock object', t => {
  const {methods} = colton({}, {
    getBar: [{
      args: ['foo'],
      returns: 'bar'
    }],
    getBaz: [{
      args: ['bar'],
      returns: 'baz'
    }]
  })

  const mock = provideMethods(methods)
  t.is(typeof mock.getBar, 'function')
  t.is(typeof mock.getBaz, 'function')

  t.is(mock.getBar('foo'), 'bar')
  t.is(mock.getBaz('bar'), 'baz')

  t.throws(
    () => mock.getBar('baz'),
    error => error instanceof ColtonConsumerError
  )
  t.throws(
    () => mock.getBar('baz', 1, 2, 3),
    error => error instanceof ColtonConsumerError
  )
})

test('provide() returns the value and method mock', t => {
  const contract = colton({
    maxFoo: 20,
    minBar: -1000
  }, {
    getFoo: [{
      args: [],
      returns: 10
    }],
    getBar: [{
      args: [3],
      returns: -222
    }]
  })

  const mock = provide(contract)
  t.is(mock.maxFoo, 20)
  t.is(mock.minBar, -1000)
  t.is(typeof mock.getFoo, 'function')
  t.is(typeof mock.getBar, 'function')
  t.is(mock.getFoo(), 10)
  t.is(mock.getBar(3), -222)
})

test('defaultCheckResult() strictly checks the actual and expected', t => {
  t.true(defaultCheckResult(4, 4))
  t.false(defaultCheckResult(4, '4'))
  t.false(defaultCheckResult(null, undefined))
})

test('defaultTestUnit() calls the function block', t => {
  let didCall = false
  defaultTestUnit('my test', () => {
    didCall = true
  })
  t.is(didCall, true)
})

test('testProviderValues() should check provider values', t => {
  const provider = {
    foo: 'bar',
    bar: 4
  }

  {
    const values = {foo: 'bar', bar: 4}
    t.notThrows(
      () => testProviderValues(defaultTestUnit, values, provider)
    )
  }

  {
    const values = {foo: 'bar', bar: 3}
    t.throws(
      () => testProviderValues(defaultTestUnit, values, provider)
    )
  }
})

test('testProviderValues() should check provider methods', t => {
  const provider = {
    getBar (foo) {
      return 'bar'
    },
    getBaz (bar) {
      return 'baz'
    }
  }

  {
    const methods = {
      getBar: [{
        args: ['foo'],
        returns: 'bar'
      }]
    }
    t.notThrows(
      () => testProviderMethods(defaultTestUnit, provider, methods)
    )
  }

  {
    const methods = {
      getBar: [{
        args: ['foo'],
        returns: 'bar'
      }],
      getBaz: [{
        args: ['bar'],
        returns: 'baz'
      }]
    }
    t.notThrows(
      () => testProviderMethods(defaultTestUnit, provider, methods)
    )
  }

  {
    const methods = {
      getBar: [{
        args: ['foo'],
        returns: 'bar'
      }],
      getBaz: [{
        args: ['baz'],
        returns: 'foo'
      }]
    }
    t.throws(
      () => testProviderMethods(defaultTestUnit, provider, methods)
    )
  }
})

test('consume() should accept a test unit', t => {
  const contract = colton({}, {
    getBar: [{
      args: ['foo'],
      returns: 'bar'
    }, {
      args: ['baz'],
      returns: 'foo'
    }]
  })

  const provider = {
    getBar (foo) {
      return 'bar'
    }
  }

  const tests = []
  const testUnit = (title, func) => {
    t.is(typeof title, 'string')
    t.is(typeof func, 'function')
    tests.push(func)
  }

  consume(contract, provider, testUnit)
  t.is(tests.length, 2)
  const [good, bad] = tests
  t.notThrows(good)
  t.throws(bad)
})
