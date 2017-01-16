import assert from 'assert'

export function validateContract (values, methods) {
  validateArgs(values, methods)
  validateKeys(values, methods)
  validateMethods(methods)
}

export function validateArgs (values, methods) {
  assert.strictEqual(
    typeof values,
    'object',
    'Contract argument `values` must be an object'
  )

  assert.strictEqual(
    typeof methods,
    'object',
    'Contract argument `methods` must be an object'
  )
}

export function validateKeys (values, methods) {
  const keySpace = [
    ...Object.keys(values),
    ...Object.keys(methods)
  ]
  const sharedKey = keySpace.find(key => (
    values.hasOwnProperty(key) && methods.hasOwnProperty(key)
  ))
  assert(
    !sharedKey,
    `Contracts must have unique keys for both values and methods, see "${sharedKey}"`
  )
}

export function validateMethods (methods) {
  for (const key in methods) {
    if (!methods.hasOwnProperty(key)) continue
    const uses = methods[key]

    // have no confusion about "default" uses
    assert(
      Array.isArray(uses) && uses.length,
      `Method ${key} must have a non-empty array of uses`
    )

    uses.forEach((use, index) => {
      const {name} = use
      const label = name ? `${key}.${name}` : `${key}[${index}]`
      validateUsage(label, use)
    })
  }
}

export function validateUsage (label, use) {
  const {
    args,
    checkArgs,
    checkResult
  } = use

  // have no confusion about "default" args
  assert(Array.isArray(args), `Usage "${label}" args must be an array`)

  const has = key => use.hasOwnProperty(key)
  const count = has('returns') + has('throws') + has('resolves') + has('rejects')

  // 0 or 1 because `returns` may be undefined which is okay
  assert(
    count === 0 || count === 1,
    `Usage "${label}" must only return, throw, resolve, or reject`
  )

  if (checkArgs) {
    assert.strictEqual(typeof checkArgs, 'function')
    assert.ok(
      checkArgs(args, args),
      `Usage "${label}" must correctly checkArgs its own args`
    )
  }

  if (checkResult) {
    assert.strictEqual(typeof checkResult, 'function')
    const {throws, resolves, rejects, returns} = use
    const result = throws | resolves | rejects | returns
    assert.ok(
      checkResult(result, result),
      `Usage "${label}" must correctly checkResult its own result`
    )
  }
}
