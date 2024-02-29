import { kernelApi } from "../asyncModules.js"
export const defineBlockList=(sql,name)=>{
    const blocks  = kernelApi.sql.sync({stmt:sql})
    window[Symbol.for('cc-global-registry')]
}