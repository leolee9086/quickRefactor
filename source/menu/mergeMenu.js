import { kernelApi,clientApi,plugin } from "../asyncModules.js";
import { 转换所有子文档为标题 } from "../utils/refactor.js";
export const 按时间顺序合并所有子文档菜单=(data)=>{
    let {id} = data 
    return [
      {
        label:plugin.i18n.转换所有子文档为标题,
        click:async ()=>{
          await 转换所有子文档为标题(id)
          window.location.reload()
        }
      }
    ]
}
export const 合并到上级文档菜单=(data)=>{
    let submenu = []
    submenu.push({
        label:plugin.i18n['合并到父文档(前置)'],
        click:()=>{
            转换文档为上级文档一级标题(data.id)
        }
    })
    submenu.push({
      label:plugin.i18n['合并到父文档(后置)'],
      click:()=>{
          转换文档为上级文档一级标题(data.id,true)
      }
  })
    return submenu
}


export async function 转换文档为上级文档一级标题(当前文档id,后置) {
    let 当前文档信息 = (
      await kernelApi.sql({
        stmt: `select * from blocks where id='${当前文档id}'`,
      })
    )[0];
    let IDpath = 当前文档信息.path.replace(".sy", "");
    let 路径id数组 = IDpath.split("/");
    if (路径id数组.length === 1) {
      return;
    } else {
      let 上级文档id = 路径id数组[路径id数组.length - 2];
      await 转换文档为目标文档标题(当前文档id, 上级文档id);
    }
  }
  async function 转换文档为目标文档标题(文档id, 目标文档id,后置) {
    let 目标文档内容 = await kernelApi.getDoc({
      id: 目标文档id,
      size: 102400,
    });
    let div = document.createElement("div");
    div.innerHTML = 目标文档内容.content;
    let 目标块id = div
      .querySelector("[data-node-id]")
      .getAttribute("data-node-id");
    await kernelApi.doc2Heading({
      srcID: 文档id,
      after: 后置?true:false,
      targetID: 目标块id,
    });
    window.location.reload() 
  }
  