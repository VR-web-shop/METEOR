import CrudAPI, { CrudAPIUtils } from './CrudAPI.js';
import fs from 'fs';

/**
 * @function BuildSDK
 * @description Build an SDK and write it to a file from a set of controllers
 * @param {string} filePath
 * @param {string} serverURL
 * @param {Object<RestController>} controllers
 * @returns {void}
 * @throws {Error} filePath is required
 * @throws {Error} serverURL is required
 * @throws {Error} controllers is required
 * @example const sdk = BuildSDK('sdk.js', 'http://localhost:3000', { 
 *  ControllerName: new ControllerName() 
 * }, { 
 *  storage: 'localStorage', key: 'auth' 
 * })
 * @example const sdk = BuildSDK('sdk.js', 'http://localhost:3000', { 
 *  ControllerName: new ControllerName() 
 * }, { 
 *  storage: 'memory', token: 'YOUR_TOKEN'
 * })
 */
const BuildSDK = function(filePath, serverURL, controllers = {}, authorization=null, debug=false) {
    if (!filePath) {
        throw new Error('filePath is required');
    }

    if (!serverURL) {
        throw new Error('serverURL is required');
    }

    if (!controllers) {
        throw new Error('controllers is required');
    }

    // Generate a JSON representation of the controllers
    const apis = []
    for (let key of Object.keys(controllers)) {
        const controller = controllers[key]
        const api = controller.generateCrudAPI(serverURL, authorization)    
        const data = CrudAPI.toJson(api)
        apis.push({ [key]: data })
    }

    

    // Convert the CrudAPI and CrudAPIUtils class to a string
    // so they can be included directly in the SDK
    const CrudAPIClassString = CrudAPI.toString()
    const CrudAPIUtilsClassString = CrudAPIUtils.toString()
    
    
    // Generate a JSON representation of the controllers
    const json = JSON.stringify({apis}, null, 4)
    const sdk = `

    /**
     * AUTO GENERATED SDK BY METEOR (Model Express Toolkit for Efficient ORM REST-APIs)
     * GitHub: https://github.com/VR-web-shop/METEOR
     * Method: BuildAPISDK
     * 
     * Example Usage:
     * import SDK from './sdk.js'
     * 
     * const sdk = SDK('http://localhost:3000')
     * 
     * sdk.api.ControllerName.find({ uuid: '00000000-0000-0000-0000-000000000000' })
     * sdk.api.ControllerName.findAll({ limit: 1, page: 1 })
     * sdk.api.ControllerName.create({ name: 'Material' })
     * sdk.api.ControllerName.update({ uuid: '00000000-0000-0000-0000-000000000000', name: 'Material' })
     * sdk.api.ControllerName.destroy({ uuid: '00000000-0000-0000-0000-000000000000' })
     */

    /**
     * @class CrudAPI
     * @classdesc A class that creates a CRUD API for a given endpoint.
     * @example new CrudAPI('http://localhost:3000', '/api/users', 'id', {
     *    authorization: { storage: 'localStorage', key: 'auth' }, or { storage: 'memory', token: 'YOUR_TOKEN' }
     *    find: { auth: true },
     *    findAll: { auth: true },
     *    create: { auth: true, properties: ['name', 'email'] },
     *    update: { auth: true, properties: ['name', 'email'] },
     *    delete: { auth: true }
     * });
     */
    ${CrudAPIClassString}

    ${CrudAPIUtilsClassString}

    /**
     * @constant apis
     * @description JSON representation of the controllers
     * that will be used to create instances of the CrudAPI class.
     */
    const apis = ${json}

    /**
     * @function SDK
     * @description Create an SDK from the server URL.
     * @param {string} serverURL - The server URL
     * @returns {Object} The SDK object
     * @example SDK('http://localhost:3000')
     */
    const SDK = function(serverURL) {    
        if (!serverURL) {
            throw new Error('serverURL is required');
        }
        
        const api = {};
        // Convert the JSON representation of the controllers
        // back to a CrudAPI instance
        for (let object of apis.apis) {
            const key = Object.keys(object)[0];
            const apiInstance = CrudAPI.fromJson(object[key]);
            
            // Use the latest server URL
            apiInstance.setServerURL(serverURL);
            api[key] = apiInstance;
        }

        // Return an object with the APIs.
        return { api }
    }

    export default SDK
    `

    if (debug) {
        console.log(`BuildSDK: ${filePath}`)
        console.log(`BuildSDK: ${serverURL}`)
        console.log(`BuildSDK: ${json}`)
        console.log(`BuildSDK: ${sdk}`)
        console.log(`Writing SDK to ${filePath}`)
    }

    fs.open(filePath, 'w', (err, fd) => {
        if (err) {
            console.error('Error opening file:', err);
            return;
        }
    
        const data = sdk;
    
        fs.writeFile(fd, data, (err) => {
            if (err) {
                console.error('Error writing to file:', err);
            } else {
                console.log(`SDK written to ${filePath}`)
            }
    
            fs.close(fd, (err) => {
                if (err) {
                    console.error('Error closing file:', err);
                } else {
                    console.log('File closed successfully');
                }
            });
        });
    });
}

export default BuildSDK
