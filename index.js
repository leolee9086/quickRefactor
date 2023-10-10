const { Plugin } = require("siyuan");
const clientApi = require("siyuan");
class PluginConfigurer {
    constructor(plugin, prop, fileName, save) {
        this.plugin = plugin
        this.plugin[prop] = this.plugin[prop] || {}
        this.target = this.plugin[prop]
        this.fileName = fileName || `${prop.json}`
        this.prop = prop
        this.save = save
    }
    async reload() {
        for (let key in this.plugin[this.prop]) {
            let data = await this.plugin.loadData(`${key}.json`)
            try {
                递归合并(this.plugin[this.prop][key], data);
            } catch (e) {
                console.error(e)
            }
            await this.plugin.saveData(`${key}.json`, this.plugin[this.prop][key])
        }
    }

    async set(...args) {
        if (args.length < 2) {
            throw new Error('You must provide at least two arguments');
        }
        let value = args.pop();
        let path = args;

        let target = this.target;
        for (let i = 0; i < path.length - 1; i++) {
            target[path[i]] = target[path[i]] || {};
            target = target[path[i]];
        }

        // 校验新值
        let oldValue = target[path[path.length - 1]];
        try {
            this.validateNewValue(oldValue, value);
        } catch (e) {
            this.plugin.eventBus.emit(`${this.prop}Change`, { name: path.join('.'), oldValue });
            throw (e)
        }
        // 如果传入的设置值为字符串或数组，且原始值有$value属性且其类型与传入值相同，将传入设置值传递给原始值的$value属性
        if ((typeof value === 'string' || Array.isArray(value)) && oldValue && oldValue.$value && typeof oldValue.$value === typeof value) {
            oldValue.$value = value;
        } else {
            target[path[path.length - 1]] = value;
        }

        this.plugin.eventBus.emit(`${this.prop}Change`, { name: path.join('.'), value });
        if (this.save) {
            await this.plugin.saveData(`${path[0]}.json`, this.target[path[0]] || {});
        }
        return this;
    }

    validateNewValue(oldValue, value) {
        // 检查旧值是否存在
        if (oldValue !== undefined) {
            // 检查旧值类型与新值类型是否相同
            if (typeof oldValue !== typeof value) {
                // 检查新值是否为字符串或数组
                if (!(typeof value === 'string' || Array.isArray(value))) {
                    // 检查旧值是否有$value属性
                    if (oldValue.$value) {
                        throw new Error(`New value must be the same type as the old value. Old value: ${oldValue}, new value: ${value}`);
                    }
                }
            }
        }

        // 检查旧值是否存在且旧值是否有$type属性
        if (oldValue && oldValue.$type) {
            // 检查新值是否没有$type属性或新值的$type与旧值的$type是否不同
            if ((!value.$type || oldValue.$type !== value.$type) && !(typeof value === 'string' || Array.isArray(value))) {
                throw new Error(`New value must have the same $type as the old value. Old value: ${oldValue}, new value: ${value}`);
            }
        }

        // 检查新值是否有$value属性
        if (value.$value) {
            // 检查新值是否没有$type属性
            if (!value.$type) {
                throw new Error(`The $value of the new value must have a $type. Old value: ${oldValue}, new value: ${value}`);
            }
            // 检查新值的$value是否不是字符串也不是数组
            else if (typeof value.$value !== 'string' && !Array.isArray(value.$value)) {
                throw new Error(`The $value of the new value must be a string or array. Old value: ${oldValue}, new value: ${value}`);
            }
        }

        // 当新旧值都有$value与$type属性时，新值所有属性必须与旧值所有属性类型一致（允许为undefined）
        if (oldValue && oldValue.$value && oldValue.$type && value.$value && value.$type) {
            for (let key in oldValue) {
                if (typeof oldValue[key] !== typeof value[key] && value[key] !== undefined) {
                    throw new Error(`New value's ${key} must be the same type as the old value's ${key}. Old value: ${oldValue[key]}, new value: ${value[key]}`);
                }
            }
        }
    }
    get(...args) {
        let target = this.target;
        for (let i = 0; i < args.length; i++) {
            if (target[args[i]] === undefined) {
                const undefinedFunction = () => { return undefined };
                undefinedFunction.$value = undefined;
                return undefinedFunction;
            }
            target = target[args[i]];
        }
        const getterFunction = (nextArg) => this.get(...args, nextArg);
        if (typeof target === 'object' && target.$type && target.$value) {
            getterFunction.$value = target.$value;
            getterFunction.$raw = target;

        } else {
            getterFunction.$value = target;
            getterFunction.$raw = target;

        }
        return getterFunction;
    }
    generatePaths(obj, currentPath = '') {
        let paths = [];
        for (let key in obj) {
            let newPath = currentPath ? `${currentPath}.${key}` : key;
            if (Array.isArray(obj[key])) {
                for (let subKey of obj[key]) {
                    paths.push(`${newPath}.${subKey}`);
                }
                if (obj[key].length === 0) {
                    paths.push(newPath);
                }
            } else if (typeof obj[key] === 'object' && obj[key].$value && obj[key].$type) {
                paths.push(newPath);
            } else if (typeof obj[key] === 'object' && Object.keys(obj[key]).length !== 0) {
                paths = paths.concat(this.generatePaths(obj[key], newPath));
            } else {
                paths.push(newPath);
            }
        }
        return paths;
    }
    recursiveQuery(path, base = '') {
        let fullPath = base ? `${base}.${path}` : path;
        let value = this.get(...(fullPath.split('.'))).$value;
        if (typeof value === 'object' && value !== null && !(value instanceof Array) && !(value.$value && value.$type)) {
            return Object.keys(value).reduce((result, key) => {
                let subPath = `${path}.${key}`;
                let subValue = this.recursiveQuery(subPath, base);
                if (Array.isArray(subValue)) {
                    result = result.concat(subValue);
                } else {
                    result.push({ path: subPath, value: subValue });
                }
                return result;
            }, []);
        } else {
            return [{ path: fullPath, value: value }];
        }
    }
    query(fields, base = '') {
        let paths = this.generatePaths(fields);
        let data = paths.reduce((result, element) => {
            let subData = this.recursiveQuery(element, base);
            return result.concat(subData);
        }, []);
        data.forEach(obj => {
            if (obj.value === undefined) {
                obj.error = `属性路径${obj.path}不存在,请检查设置和查询参数`
            }
        });
        return data;
    }
    list() {
        return this.target
    }
}
class ccPlugin extends Plugin {
    初始化状态存储() {
        this.statusMonitor = new PluginConfigurer(this, 'status')
    }
    async 初始化设置() {
        this.configurer = new PluginConfigurer(this, 'setting', 'setting', true)
        await this.configurer.reload()
    }


    初始化环境变量() {
        this.selfURL = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/plugins/${this.name}/`;
        this.dataPath = `/data/storage/petal/${this.name}`
        this.tempPath = `/temp/ccTemp/${this.name}/`
        this.publicPath = `/data/public`
        this.selfPath = `/data/plugins/${this.name}`
        if (window.require) {
            this.localPath = window.require('path').join(window.siyuan.config.system.workspaceDir, 'data', 'plugins', this.name)
        }
    }
    resolve(路径) {
        if (路径.startsWith('/') || 路径.startsWith('http://') || 路径.startsWith('https://')) {
            // 如果路径是绝对路径或者外部路径，直接返回原始值
            return 路径;
        } else {
            // 如果路径是相对路径，从this.selfURL开始解析
            return decodeURIComponent(new URL(路径, this.selfURL).toString());
        }
    }
    //这个是白魔法不是黑魔法
    从esm模块(moduleURL) {
        moduleURL = this.resolve(moduleURL)
        const 定义属性 = async (obj, name, value, options = {}) => {
            if (obj.hasOwnProperty(name)) {
                throw new Error(`属性${name}已经存在，不要覆盖它`);
            }
            const { 只读 = true, 别名 = name } = options;
            Object.defineProperty(obj, 别名, {
                value: value,
                writable: !只读,
                configurable: true
            });
        };
        return {
            合并子模块: async (name) => {
                try {
                    const module = await import(moduleURL);
                    let fileName = 获取文件名(moduleURL);
                    await 定义属性(this, fileName, module);
                    name ? await 定义属性(this, name, module) : null
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },

            合并成员为只读属性: async (name, options) => {
                try {
                    const value = (await import(moduleURL))[name];
                    await 定义属性(this, name, value, options);
                } catch (error) {
                    console.error(`导入模块${moduleURL}的属性${name}失败:`, error);
                    throw error;
                }
            },
            合并全部成员为只读属性: async () => {
                try {
                    const module = await import(moduleURL);
                    for (let name in module) {
                        await 定义属性(this, name, module[name]);
                    }
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },
            设置模块为只读属性: async (name, options) => {
                try {
                    const module = await import(moduleURL);
                    await 定义属性(this, name, module, options);
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },
            获取依赖: async (name, options) => {
                try {
                    if (!this.依赖) {
                        this.依赖 = {};
                    }
                    const module = await import(moduleURL);
                    await 定义属性(this.依赖, name, module, options);
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },
            获取成员为依赖: async (name, options) => {
                try {
                    if (!this.依赖) {
                        this.依赖 = {};
                    }
                    const module = await import(moduleURL);
                    await 定义属性(this.依赖, name, module[name], options);
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },
            获取工具: async (name, options) => {
                try {
                    if (!this.工具箱) {
                        this.工具箱 = {};
                    }
                    const module = await import(moduleURL);
                    await 定义属性(this.工具箱, name, module, options);
                } catch (error) {
                    console.error(`导入模块${moduleURL}失败:`, error);
                    throw error;
                }
            },
        }
    }
    设置别名(别名字典) {
        for (let 原名 in 别名字典) {
            let 别名列表 = 别名字典[原名];
            if (!Array.isArray(别名列表)) {
                别名列表 = [别名列表];
            }
            for (let 别名 of 别名列表) {
                if (this.hasOwnProperty(别名)) {
                    throw new Error(`别名${别名}已经存在，不要覆盖它`);
                }
                Object.defineProperty(this, 别名, {
                    get: () => this[原名],
                    set: (value) => { this[原名] = value; },
                    enumerable: true,
                    configurable: true
                });
            }
        }
    }
}
module.exports = class quickRefactor extends ccPlugin {
    onload() {
        this.初始化环境变量()
        this.初始化()
    }
    async 初始化(){
        await this.暴露插件环境()
        await this.加载依赖()
        this.初始化菜单()

    }
    async 暴露插件环境(){
        window[Symbol.for(`plugin_${this.name}`)] = this
        window[Symbol.for(`clientApi`)] = clientApi
        await this.从esm模块('./source/asyncModules.js').合并全部成员为只读属性()
    }
    async 加载依赖() {
        await  this.从esm模块('./source/menu/index.js').合并子模块('菜单控制器')
    }
    async 初始化菜单() {
        await this.菜单控制器.开启拆分菜单()
        await this.菜单控制器.开启合并菜单()
        await this.菜单控制器.开启移动菜单()
    }
}
function 获取文件名(moduleURL) {
    // 替换所有的 '\\' 为 '/'
    moduleURL = moduleURL.replace(/\\/g, '/');
    // 移除路径中的 '//'，除非它在 'http://' 或 'https://' 中
    moduleURL = moduleURL.replace(/([^:])\/\//g, '$1/');
    // 从路径中获取文件名
    let fileName = moduleURL.substring(moduleURL.lastIndexOf('/') + 1);
    // 如果文件名是 'index.js'，获取文件夹名
    if (fileName === 'index.js') {
        let parts = moduleURL.split('/');
        // 移除最后两个部分（'index.js' 和 文件夹名）
        parts.pop();
        // 添加文件夹名作为新的文件名
        fileName = parts.pop();
    } else {
        // 移除扩展名
        fileName = fileName.substring(0, fileName.lastIndexOf('.'));
    }
    return fileName;
}

/**
* 递归合并两个对象
* @param {Object} 目标对象 - 要合并到的对象
* @param {Object} 源对象 - 要从中合并的对象
*/
function 递归合并(目标对象, 源对象) {
    if (!源对象) {
        return;
    }
    for (let 键 in 源对象) {
        if (源对象.hasOwnProperty(键)) {
            if (Object.prototype.toString.call(源对象[键]) === '[object Object]' && !源对象[键].$value && !(目标对象[键] && 目标对象[键].$value)) {
                // 如果当前属性是对象，并且源对象[键]和目标对象[键]都没有$value属性，则递归合并
                目标对象[键] = 目标对象[键] || {};
                递归合并(目标对象[键], 源对象[键]);
            } else {
                // 否则，直接复制属性值，如果有$value属性，就使用$value的值
                目标对象[键] = 源对象[键]
            }
        }
    }
}
