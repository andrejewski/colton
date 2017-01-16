import test from 'ava'
import colton, {
  provide,
  consume,
  raise
} from '../src'

test('colton should be exported', t => {
  t.is(typeof colton, 'function')
})

test('colton returns the contract structure', t => {
  const values = {}
  const methods = {}
  const contract = colton(values, methods)
  t.is(contract.values, values)
  t.is(contract.methods, methods)
})

test('provide() should be exported', t => {
  t.is(typeof provide, 'function')
})

test('consume() should be exported', t => {
  t.is(typeof consume, 'function')
})

test('raise() should be exported', t => {
  t.is(typeof raise, 'function')
})
