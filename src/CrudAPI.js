
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
export default class CrudAPI {
    constructor(serverURL, endpoint, foreignKeyName = '', options = {}) {
        const url = `${serverURL}${endpoint}`;
        let authorizationOptions = options.authorization || {};

        /**
         * @function buildRequestOptions
         * @description Builds the request options for the API.
         * @param {object} requestOptions - The request options.
         * @param {boolean} useAuth - Whether to use authorization.
         * @returns {object} The built request options.
         * @example const requestOptions = buildRequestOptions({ method: 'GET' }, true);
         */
        const buildRequestOptions = async function (requestOptions, useAuth = false) {

            if (useAuth) {
                if (authorizationOptions.storage === 'localStorage') {
                    const token = localStorage.getItem(authorizationOptions.key);
                    if (token) {
                        requestOptions.headers = {
                            ...requestOptions.headers,
                            'Authorization': `Bearer ${token}`
                        };
                    }
                } else if (authorizationOptions.storage === 'memory') {
                    requestOptions.headers = {
                        ...requestOptions.headers,
                        'Authorization': `Bearer ${authorizationOptions.token}`
                    };
                }
            }

            return requestOptions;
        }

        /**
         * @function setAuthorizationOptions
         * @description Sets the authorization options for the API.
         * @param {object} newOptions - The new authorization options.
         * @example setAuthorizationOptions({ storage: 'localStorage', key: 'auth' });
         * @example setAuthorizationOptions({ storage: 'memory', token: 'YOUR_TOKEN' });
         */
        this.setAuthorizationOptions = function (newOptions) {
            authorizationOptions = newOptions;
        }

        if (options.find) {
            /**
             * @function find
             * @description Finds a record by the foreign key.
             * @param {object} params - The parameters to use for the find operation.
             * @param {object} methodOptions - The method options.
             * @returns {object} The found record.
             * @example const record = await find({ id: 1 });
             * @example const record = await find({ id: 1 }, { include: 'profile' });
             */
            this.find = async function (params, methodOptions = {}) {
                const key = params[foreignKeyName];
                if (!key) {
                    throw new Error(`No ${foreignKeyName} provided.`);
                }

                let currentEndpoint = `${url}/${key}`;
                if (methodOptions.include) {
                    currentEndpoint += `/${methodOptions.include}`;
                }

                const requestOptions = buildRequestOptions({ method: 'GET' }, options.find.auth);
                const response = await fetch(currentEndpoint, requestOptions);
                const data = await response.json();
                return data;
            };
        }

        if (options.findAll) {
            /**
             * @function findAll
             * @description Finds all records.
             * @param {object} params - The parameters to use for the find all operation.
             * @returns {object} The found records.
             * @example const records = await findAll({ limit: 10 });
             * @example const records = await findAll({ limit: 10, page: 1 });
             * @example const records = await findAll({ limit: 10, page: 1, q: 'search' });
             * @example const records = await findAll({ limit: 10, page: 1, q: 'search', include: 'profile' });
             */
            this.findAll = async function (params) {
                const { page, limit, q, include } = params;
                let _endpoint = `${url}?limit=${limit}`;
                if (page) _endpoint += `&page=${page}`;
                if (q) _endpoint += `&q=${q}`;
                if (include) _endpoint += `&include=${include}`;

                const requestOptions = buildRequestOptions({ method: 'GET' }, options.findAll.auth);
                const response = await fetch(_endpoint, requestOptions);
                const data = await response.json();
                return data;
            };
        }

        if (options.create) {
            /**
             * @function create
             * @description Creates a record.
             * @param {object} params - The parameters to use for the create operation.
             * @returns {object} The created record.
             * @example const record = await create({ name: 'John Doe', email: 'test@example.com' });
             */
            this.create = async function (params) {
                for (let key of options.create.properties) {
                    if (!params[key]) {
                        throw new Error(`No ${key} provided.`);
                    }
                }

                const requestOptions = buildRequestOptions({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: params
                }, options.create.auth);
                const response = await fetch(url, requestOptions);
                const data = await response.json();
                return data;
            };
        }

        if (options.update) {
            /**
             * @function update
             * @description Updates a record.
             * @param {object} params - The parameters to use for the update operation.
             * @returns {object} The updated record.
             * @example const record = await update({ id: 1, name: 'Jane Doe', email: 'test2@example.com' });
             */
            this.update = async function (params) {
                if (options.update.requiredProperties) {
                    for (let key of options.update.requiredProperties) {
                        if (!params[key]) {
                            throw new Error(`No ${key} provided.`);
                        }
                    }
                }

                const key = params[foreignKeyName];
                if (!key) {
                    throw new Error(`No ${foreignKeyName} provided.`);
                }

                const requestOptions = buildRequestOptions({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: params
                }, options.update.auth);
                const response = await fetch(url, requestOptions);
                const data = await response.json();
                return data;
            };
        }

        if (options.delete) {
            /**
             * @function destroy
             * @description Destroys a record.
             * @param {object} params - The parameters to use for the destroy operation.
             * @returns {boolean} Whether the record was destroyed.
             * @example const result = await destroy({ id: 1 });
             */
            this.destroy = async function (params) {
                const key = params[foreignKeyName];
                if (!key) {
                    throw new Error(`No ${foreignKeyName} provided.`);
                }

                const requestOptions = buildRequestOptions({
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: params
                }, options.delete.auth);
                const response = await fetch(url, requestOptions);
                return response.status === 204;
            };
        }
    }

    static buildOptions(options={}, auth=false) {
        const apiOptions = {}

        if (options.authorization) apiOptions.authorization = options.authorization
        if (options.find) apiOptions.find = { auth }
        if (options.findAll) apiOptions.findAll = { auth }
        if (options.create) apiOptions.create = { auth, 
            properties: options.create.properties 
        }
        if (options.update) apiOptions.update = { auth, 
            properties: options.update.properties, 
            requiredProperties: options.update.requiredProperties 
        }
        if (options.delete) apiOptions.delete = { auth }
        
        return apiOptions;
    }
}
