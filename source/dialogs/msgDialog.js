import { clientApi,plugin } from "../asyncModules.js";
export const msgDialog = ()=>{
   let dialog=new clientApi.Dialog({
        title: plugin.i18n.正在执行操作,
        content: '<div id="custom-dialogContent"></div>',
        width: "90vw",
        destroyCallback: async () => { },
        disableClose:true
      });
  dialog.appendMsg=(content)=>{
      dialog.element.querySelector('#custom-dialogContent').innerHTML+=content
  }
  return dialog
}