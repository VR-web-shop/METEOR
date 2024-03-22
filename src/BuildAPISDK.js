import CrudAPI from './CrudAPI.js';
import fs from 'fs';

/**
 * @function BuildSDK
 * @param {string} filePath
 * @param {string} serverURL
 * @param {Array} controllers
 */
const BuildSDK = function(filePath, serverURL, controllers = []){
    const apis = []

    for (let key of Object.keys(controllers)) {
        const controller = controllers[key]
        const api = controller.generateCrudAPI(serverURL)    
        const data = CrudAPI.toJson(api)
        apis.push({ [key]: data })
    }

    const classString = meteor.CrudAPI.toString()
    const json = JSON.stringify({apis}, null, 4)
    const sdk = `
    const CrudAPI = ${classString}
    const apis = ${json}
    const SDK = function(serverURL) {    
        if (!serverURL) {
            throw new Error('serverURL is required');
        }
        
        const api = {};
        const controllers = apis.apis;
        console.log(controllers);
        for (let object of apis.apis) {
            const key = Object.keys(object)[0];
            const parsed = JSON.parse(object[key]);
            const apiInstance = CrudAPI.fromJson(parsed);
            apiInstance.setServerURL(serverURL);
            api[key] = apiInstance;
        }

        return { api }
    }

    export default SDK
    `

    fs.writeFileSync(filePath, sdk)
}

export default BuildSDK
