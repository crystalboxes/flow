export { default as background } from './background'
export { default as floor } from './floor'
export { default as opacity } from './opacity'
export { default as rendering } from './rendering'
export { default as soft } from './soft'
export { default as simulation } from './simulation'
export { default as resample } from './resample'

export interface ProgramWrapper {
  program: WebGLProgram
  uniformLocations: { [index: string]: WebGLUniformLocation }
}
