import { kernelApi } from "../asyncModules.js"
import { 提取附加信息 } from "./additionalContent.js"

let blockLists 
export const defineBlockList = (sql, name) => {
    const blocks = kernelApi.sql.sync({ stmt: sql })
    return blocks
}
export const getSqlTargetDefine = () => {
    if (!blockLists) {
        const sql = `select * from blocks where type="c" and not name  = '' and ( markdown like '\`\`\`SQL%' or markdown like '\`\`\`sql%'  )`
        const blockListDefined = defineBlockList(sql)
        blockLists = blockListDefined.map(
            item => {
                return {
                    name: item.name,
                    data: kernelApi.sql.sync({ stmt: item.content })
                }
            }
        )
    }
    return blockLists
}
export async function getSuitableDocIDUsingAI(docContent, targets) {
    console.log(window.siyuan.config);
    const openAIConfig = window.siyuan.config.ai.openAI;

    // 准备请求OpenAI API的参数
    const requestBody = {
        messages:[
{
role:"system",
content:`
你是一个文档分类助手,工作是根据提供的文档内容和分类目标
你必须从所有分类目标中找到与提供的文档内容最接近的笔记并以指定格式返回
你必须严格遵守以下要求:

## 文档内容

文档内容以markdown字符串的形式提供给你,

## 分类目标

分类目标是一个数组,会出现在UserMessageAttach的queriedNotes字段中
格式如下
\`\`\`UserMessageAttach
{queriedNotes:[
    id:<笔记的id>,
    rootID:<笔记所在文档的id>
    content:<笔记的markdown文字内容>,
    attrs:<笔记条目的属性>,
    title:<笔记的标题>
]}
\`\`\`

## 回复格式
你必须将最合适的目标id添加到回复的AIMessageAttach的moveTarget字段中,并在回复正文以100字以内说明你的理由,
AIMessageAttach必须以代码块的形式添加在标准markdown格式的回复最后,
你必须要严格按照内容主题的匹配程度来选择分类目标,不能随意选择
AIMessageAttach的格式为标准JSON字符串,如下所示:

\`\`\`AIMessageAttach
{
    "moveTarget":<最合适的移动目标ID数组,必须从queriedNotes数组中,根据内容的匹配程度选取1个到3个最合适目标的**rootID**>
}
\`\`\`
`
},
{
    role:"user",
    content:`
待分类的文档内容是:
${docContent.content.slice(0,1024)}

\`\`\`UserMessageAttach
{queriedNotes:${JSON.stringify(targets.filter(item=>{return item.rootID!==docContent.id}))}}

\`\`\`
`
}
        ],
        max_tokens: openAIConfig.apiMaxTokens ,
        model: openAIConfig.apiModel ,
    };

    try {
        // 调用OpenAI API
        const response = await fetch(openAIConfig.apiBaseURL + "/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAIConfig.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data)
        // 假设data.choices[0].text包含了推荐的文档标题
        const recommendedTitles = 提取附加信息(data.choices[0].message.content).moveTarget
        console.log(recommendedTitles) 
        // 在targets中查找与推荐标题最匹配的文档ID
        const suitableDoc = targets.filter(
            item=>{
                console.log(item,recommendedTitles)
                return recommendedTitles.indexOf(item.rootID)>-1||recommendedTitles.find(target=>{
                    return target.rootID===item.rootID
                })
            }
        )

        if (suitableDoc) {
            console.log(`找到推荐的文档ID:` ,suitableDoc);
            return {targets:suitableDoc,reason:data.choices[0].message.content.split(`\`\`\`AIMessageAttach`)[0]};
        } else {
            console.log("没有找到合适的文档ID");
            return null; // 或者返回一个默认值或错误处理
        }
    } catch (error) {
        console.error("处理文档时发生错误:", error);
        return null; // 或者返回一个默认值或错误处理
    }
}


