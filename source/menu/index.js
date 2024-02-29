import { kernelApi, plugin } from "../asyncModules.js";
import { 按标题级别拆分菜单 } from './splitMenu.js'
import { 合并到上级文档菜单, 按时间顺序合并所有子文档菜单 } from "./mergeMenu.js";
import BlockHandler from "../utils/blockHandler.js";
let { eventBus } = plugin
export function 开启拆分菜单() {
    eventBus.on('click-editortitleicon', async (e) => {
        let { data, menu } = e.detail
        menu.addItem({
            'label': "拆分文档",
            'submenu': 按标题级别拆分菜单(data)
        })
    })
}
export function 开启合并菜单() {
    eventBus.on('click-editortitleicon', async (e) => {
        let { data, menu } = e.detail
        // 创建按一级到六级标题拆分的菜单项
        menu.addItem({
            'label': "合并文档",
            'submenu': 合并到上级文档菜单(data).concat(按时间顺序合并所有子文档菜单(data))
        })
    })
    eventBus.on('open-menu-doctree', async (e) => {
        let { menu } = e.detail
        if (e.detail.type === 'doc') {
            let ids = Array.from(e.detail.elements).map(item => {
                return item.getAttribute('data-node-id')
            })
            let recentDocs = kernelApi.getRecentDocs.sync()
            menu.addItem({
                'label': "移动到最近文档",
                'submenu': recentDocs.map(
                    item => {
                        return {
                            label: `移动文档到${item.title}`,
                            click: () => {
                                ids.forEach(id => {
                                    new BlockHandler(id).moveDocTo(item.rootID)
                                });
                            }
                        }
                    }
                )
            })
            menu.addItem({
                'label': "移动到笔记本",
                'submenu': siyuan.notebooks.map(
                    item => {
                        return {
                            label: `移动文档到${item.name}`,
                            click: () => {
                                ids.forEach(
                                    id => new BlockHandler(id).moveDocTo(item.id, true)
                                )
                            }
                        }
                    }
                )
            })
        } else if (e.detail.type === 'notebook') {
            let box = e.detail.elements[0].parentElement.getAttribute('data-url')
            let recentDocs = kernelApi.getRecentDocs.sync()
            menu.addItem({
                'label': "将最近文档移入",
                'submenu': recentDocs.map(
                    item => {
                        return {
                            label: `${item.title}`,
                            click: () => {
                                new BlockHandler(item.rootID).moveDocTo(box, true)
                            }
                        }
                    }
                )
            })

        }
        // 创建按一级到六级标题拆分的菜单项
    })
}

export function 开启移动菜单() {
    eventBus.on('click-editortitleicon', async (e) => {
        let { data, menu } = e.detail
        let recentDocs = kernelApi.getRecentDocs.sync()
        // 创建按一级到六级标题拆分的菜单项
        menu.addItem({
            'label': "移动到最近文档",
            'submenu': recentDocs.map(
                item => {
                    return {
                        label: `移动文档到${item.title}`,
                        click: () => {
                            new BlockHandler(data.id).moveDocTo(item.rootID)
                        }
                    }
                }
            )
        })
    })
    eventBus.on('click-blockicon', (e) => {
        console.log(e)
        const { blockElements, menu, protyle } = e.detail
        let blockRefIds = []
        blockElements.forEach(
            element => {
                /* const refs = kernelApi.sql.sync({
                     //这个sql只能够选择到直接定义在块内部的refs,如果是容器块就失效了,所以我们需要用获取块DOM的方式来完成这个任务
                     stmt:`select * from refs where block_id = "${element.getAttribute('data-node-id')}"`
                 })*/
                let blockDOM = kernelApi.getDoc.sync({ id: element.getAttribute('data-node-id') }).content
                const div = document.createElement('div')
                div.innerHTML = blockDOM
                Array.from(div.querySelectorAll('span[data-type="block-ref"]')).forEach(
                    refSpan => {
                        blockRefIds.push(refSpan.getAttribute('data-id'))
                    }
                )
                //blockRefs=blockRefs.concat(refs)
            }
        )
        let uniqueBlockRefIds = [...new Set(blockRefIds)];
        // 为每个ID构建一个查询条件，并使用OR连接
        let conditions = uniqueBlockRefIds.map(id => `def_block_id = "${id}"`).join(" OR ");
        // 构建SQL查询
        let sql = `SELECT * FROM refs WHERE ${conditions}`;
        // 执行SQL查询
        // 注意：这里假设你有一个执行SQL的函数。根据你的环境，这可能需要异步处理或其他API调用。
        let queryResult = kernelApi.sql.sync({ stmt: sql });
        menu.addItem(
            {
                label:"将块引目标文档移入",
                submenu:queryResult.filter(ref=>{
                    return ref.def_block_root_id!==ref.root_id
                }).map(
                    ref=>{
                        return  {
                            label:`将${ref.content}指向的文档移动到子文档`,
                            click:()=>{
                                new BlockHandler(ref.def_block_root_id).moveDocTo(ref.root_id)
                            }
                        }
                    }
                )
            }
        )
    })
}


