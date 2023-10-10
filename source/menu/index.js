import {  plugin } from "../asyncModules.js";
import {按标题级别拆分菜单} from './splitMenu.js'
import { 合并到上级文档菜单,按时间顺序合并所有子文档菜单 } from "./mergeMenu.js";
let {eventBus} =plugin
export function 开启拆分菜单(){
    eventBus.on('click-editortitleicon', async (e) => {
        let { data, menu } = e.detail
        menu.addItem({
            'label':"拆分文档",
            'submenu':按标题级别拆分菜单(data)
        })
    })
}
export function 开启合并菜单(){
    eventBus.on('click-editortitleicon', async (e) => {
        let { data, menu } = e.detail
        // 创建按一级到六级标题拆分的菜单项
        menu.addItem({
            'label':"合并文档",
            'submenu':合并到上级文档菜单(data).concat(按时间顺序合并所有子文档菜单(data))
        })
    })
}
export function 开启移动菜单(){}
