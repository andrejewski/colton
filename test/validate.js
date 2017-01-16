import test from 'ava'
import {
  validateArgs,
  validateKeys,
  validateMethods,
  validateUsage
} from '../src/validate'

test('validateArgs() should only accept two objects', t => {
  t.notThrows(() => validateArgs({}, {}))
  t.throws(() => validateArgs())
  t.throws(() => validateArgs(1))
  t.throws(() => validateArgs(1, 2))
})

test('validateKeys() should only allow unique keys', t => {
  {
    const values = {foo: 'bar'}
    const methods = {getBar () { return 'baz' }}
    t.notThrows(() => validateKeys(values, methods))
  }

  {
    const values = {foo: 'bar'}
    const methods = {foo () { return 'baz' }}
    t.throws(() => validateKeys(values, methods))
  }
})

test('validateMethods() should only accept non-empty arrays of uses', t => {
  {
    const methods = {getFoo: 'bar'}
    t.throws(() => validateMethods(methods))
  }

  {
    const methods = {getFoo: []}
    t.throws(() => validateMethods(methods))
  }

  {
    // NOTE: there is coverage overlap with validateUsage()
    const methods = {
      getFoo: [{
        args: []
      }]
    }
    t.notThrows(() => validateMethods(methods))
  }
})

test('validateUsage() should only accept an arg array', t => {
  const label = 'argCheck'

  {
    const use = {args: 'foo'}
    t.throws(() => validateUsage(label, use))
  }

  {
    const use = {args: []}
    t.notThrows(() => validateUsage(label, use))
  }
})

test('validateUsage() should only accept one or no reply type', t => {
  const label = 'replyCheck'

  {
    const use = {args: []}
    t.notThrows(() => validateUsage(label, use))
  }

  {
    const use = {args: [], returns: 5}
    t.notThrows(() => validateUsage(label, use))
  }

  {
    const use = {args: [], returns: 5, resolves: 25}
    t.throws(() => validateUsage(label, use))
  }
})

test('validateUsage() should ensure args and result pass their own checks', t => {
  const label = 'checkCheck'

  {
    const use = {
      args: [2, 4],
      checkArgs: ([x, y]) => (x * 2) === y
    }
    t.notThrows(() => validateUsage(label, use))
  }

  {
    const use = {
      args: [2, 5],
      checkArgs: ([x, y]) => (x * 2) === y
    }
    t.throws(() => validateUsage(label, use))
  }

  {
    const use = {
      args: [],
      returns: 2,
      checkResult: x => (x % 2) === 0
    }
    t.notThrows(() => validateUsage(label, use))
  }

  {
    const use = {
      args: [],
      returns: 3,
      checkResult: x => (x % 2) === 0
    }
    t.throws(() => validateUsage(label, use))
  }
})
