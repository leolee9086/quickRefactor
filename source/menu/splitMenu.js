import { kernelApi,clientApi,plugin } from "../asyncModules.js";
import BlockHandler from "../utils/blockHandler.js";

export const 按标题级别拆分菜单 = (data) => {
    let submenu = []
            // 创建按一级到六级标题拆分的菜单项
    for (let i = 1; i <= 6; i++) {
        submenu.push
            ({
                label: plugin.i18n[`按${i}级标题拆分`],
                icon: "",
                click: () => {
                    let { id } = data
                    let 标题块数组 = kernelApi.sql.sync({
                        stmt: `select * from blocks where subtype = "h${i}" and root_id = "${id}"`
                    })
                    标题块数组.forEach(标题块 => {
                        let 块操作器 = new BlockHandler(标题块.id)
                        块操作器.toChildDoc()
                    })
                }
            })
    }
    return submenu
}