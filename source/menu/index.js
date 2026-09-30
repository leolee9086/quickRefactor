import { kernelApi, plugin, clientApi } from "../asyncModules.js";
import { 按标题级别拆分菜单 } from './splitMenu.js'
import { 合并到上级文档菜单, 按时间顺序合并所有子文档菜单 } from "./mergeMenu.js";
import BlockHandler from "../utils/blockHandler.js";
import { defineBlockList, getSqlTargetDefine, getSuitableDocIDUsingAI } from "../utils/blockListDefine.js";

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
            'submenu': [{
                label: "AI辅助判断",
                icon: "iconSparkles",
                click: async () => {
                    let content = kernelApi.exportMdContent.sync({ id: data.id })
                    content.content=data.name+"\n"+content.content.trim()
                    content.id = data.id
                    let blocks = kernelApi.getRecentDocs.sync()
                    let suitableDoc = await getSuitableDocIDUsingAI(content, blocks)
                    
                    await clientApi.confirm(
                        "确认移动?",
                        `AI认为,这个文档最适合移动到${suitableDoc.targets[0].title},理由如下:\n
                        ${suitableDoc.reason}
                        \n是否确认?`,
                        async () => {
                            new BlockHandler(data.id).moveDocTo(suitableDoc.targets[0].rootID)

                        },
                        () => {
                        }
                    );
                }
            }].concat(recentDocs.map(
                item => {
                    return {
                        label: `移动文档到${item.title}`,
                        click: () => {
                            new BlockHandler(data.id).moveDocTo(item.rootID)
                        }
                    }
                }
            )

            )
        })
        getSqlTargetDefine().forEach(
            block => {
                menu.addItem(
                    {
                        'label': "移动到命名块列表:" + block.name,
                        'submenu': [{
                            label: "AI辅助判断",
                            click: async () => {
                                let content = kernelApi.exportMdContent.sync({ id: data.id })
                                content.content=data.name+"\n"+content.content.trim()
                                content.id = data.id
                                let blocks = block.data.map(
                                    item => {
                                        return {
                                            rootID: item.root_id,
                                            title: item.name || item.content.slice(0, 16),
                                            content: item.content.slice(0, 300)
                                        }
                                    }
                                )
                                let suitableDoc = await getSuitableDocIDUsingAI(content, blocks.slice(0, 64))
                                await clientApi.confirm(
                                    "确认移动?",
                                    `AI认为,这个文档最适合移动到${suitableDoc.targets[0].title}所在目录,理由如下:\n
                                    ${suitableDoc.reason}
                                    \n是否确认?`,
                                    async () => {
                                        new BlockHandler(data.id).moveDocTo(suitableDoc.targets[0].rootID)
                                    },
                                    () => {
                                    }
                                );
                            }
                        }].concat(block.data.map(
                            item => {
                                return {

                                    label: `移动文档到${item.name || item.content.split(0, 16)}`,
                                    click: () => {
                                        new BlockHandler(block.id).moveDocTo(item.rootID)
                                    }
                                }
                            }
                        ))
                    }
                )
            }
        )

    })
    eventBus.on('click-blockicon', (e) => {
        const { blockElements, menu, protyle } = e.detail
        let blockRefIds = []
        blockElements.forEach(
            element => {
                /* const refs = kernelApi.sql.sync({
                     //这个sql只能够选择到直接定义在块内部的refs,如果是容器块就失效了,所以我们需要用获取块DOM的方式来完成这个任务
                     stmt:`select * from refs where block_id = "${element.getAttribute('data-node-id')}"`
                 })*/
                // getDoc 在块不存在或请求失败时可能返回 null/undefined（如思源 3.8.6+），
                // 直接读取 .content 会抛出未捕获异常，中断块标菜单渲染并导致块拖拽失效，这里需要先判空
                let doc = kernelApi.getDoc.sync({ id: element.getAttribute('data-node-id') })
                if (!doc || !doc.content) {
                    return
                }
                let blockDOM = doc.content
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
        // 没有任何块引用时直接返回，否则会拼出 WHERE 为空的非法 SQL，查询失败同样会导致菜单渲染中断
        if (!uniqueBlockRefIds.length) {
            return
        }
        // 为每个ID构建一个查询条件，并使用OR连接
        let conditions = uniqueBlockRefIds.map(id => `def_block_id = "${id}"`).join(" OR ");
        // 构建SQL查询
        let sql = `SELECT * FROM refs WHERE ${conditions}`;
        // 执行SQL查询
        // 注意：这里假设你有一个执行SQL的函数。根据你的环境，这可能需要异步处理或其他API调用。
        // 查询失败时返回 undefined，兜底为空数组避免后续 filter 抛错
        let queryResult = kernelApi.sql.sync({ stmt: sql }) || [];
        menu.addItem(
            {
                label: "将块引目标文档移入",
                submenu: queryResult.filter(ref => {
                    return ref.def_block_root_id !== ref.root_id
                }).map(
                    ref => {
                        return {
                            label: `将${ref.content}指向的文档移动到子文档`,
                            click: () => {
                                new BlockHandler(ref.def_block_root_id).moveDocTo(ref.root_id)
                            }
                        }
                    }
                )
            }
        )
    })
}


