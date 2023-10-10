import { kernelApi } from "../asyncModules.js"
import { msgDialog } from "../dialogs/megDialog.js"
export async function 批量转换文档为标题(文档组, 文档id, 后置) {
    //这里为啥要倒一下
    let dialog = msgDialog()

    for await (let 文档属性 of !后置 ? 文档组.reverse() : 文档组) {
        if (文档属性.subFileCount) {
            await 转换所有子文档为标题(文档属性.id, 后置)
        }
        await 转换文档为目标文档标题(文档属性.id, 文档id, 后置)
        dialog.appendMsg(`
        <label class="b3-label fn__flex">
        <div class="fn__flex-1">
            <div class="b3-label__text">
  转换文档${文档属性.id}到${文档id}内标题完成
  </div>
        </div>
        <div class="fn__space"></div>
  `)
    }
    dialog.destroy()
}
export async function 转换所有子文档为标题(文档id, 后置) {
    let 文档属性 = await kernelApi.sql({ stmt: `select * from blocks where id = '${文档id}'` })
    let 子文档列表 = await kernelApi.listDocsByPath(
        {
            notebook: 文档属性[0].box,
            path: 文档属性[0].path,
            sort: window.siyuan.config.fileTree.sort
        }
    )
    await 批量转换文档为标题(子文档列表.files, 文档id, 后置)
}
export async function 转换文档为目标文档标题(文档id, 目标文档id, 后置, 回调函数) {
    let 目标文档内容 = await kernelApi.getDoc({
        id: 目标文档id,
        size: 102400,
    });
    let div = document.createElement("div");
    div.innerHTML = 目标文档内容.content;
    let 目标块id = div
        .querySelector("[data-node-id]")
        .getAttribute("data-node-id");
    if (后置) {

        目标块id = Array.from(div
            .querySelectorAll("[data-node-id]:not(div[data-node-id] div[data-node-id])")
        ).pop()
            .getAttribute("data-node-id");

    }
    await kernelApi.doc2Heading({
        srcID: 文档id,
        after: 后置 ? true : false,
        targetID: 目标块id,
    });
}
