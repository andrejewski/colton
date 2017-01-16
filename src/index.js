import {validateContract} from './validate'
export {
  raise,
  provide,
  consume
} from './testing'

export default function colton (values, methods) {
  validateContract(values, methods)
  return {values, methods}
}
