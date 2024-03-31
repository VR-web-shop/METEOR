import ApiRequestError from './ApiRequestError.js';
import ParamsBuilder from './ParamsBuilder.js';
import StorageService from './StorageService.js';

/**
 * @class CrudService
 * @classdesc A class that generates CRUD services for a given Sequelize model.
 * @example new CrudService(Model, 'uuid', {
 * 
 *    // Provide an upload configuration to allow file uploads for the entity.
 *    upload: {
 *      // The fields of the record storing the file URL.
 *      // For example, if the entity has a 'profilePicture' field, 
 *      // the fields would be ['profilePicture']
 *      fields: [string],
 * 
 *      // Use a custom method to handle the file uploads
 *      customService: {
 *          uploadFile: async (file, key) => string_url,
 *          updateFile: async (file, key) => string_url,
 *          deleteFile: async (key) => void,
 *          parseKey: (entity) => string_key
 *      },
 * 
 *      // or use the built-in S3 service to handle the file uploads
 *      s3: {
 *          endpoint: string,
 *          region: string,
 *          bucketName: string,
 *          cdnURL: string,
 *          prefix: string,
 *          credentials: {
 *              accessKeyId: string,
 *              secretAccessKey: string
 *          } 
 *      }
 *    },
 * 
 *    // Provide a find configuration to allow finding a single entity.
 *    find: { 
 *      dto: ['uuid', 'name'] 
 *    },
 * 
 *    // Provide a findAll configuration to allow finding multiple entities.
 *    findAll: { 
 *      searchProperties: ['name'], 
 *      whereProperties: ['name'],
 *      defaultLimit: 10, 
 *      defaultPage: 1, 
 *      dto: ['uuid', 'name']
 *    },
 * 
 *    // Provide a create configuration to allow creating a new entity.
 *    create: {
 *      properties: ['name'],
 *      dto: ['uuid', 'name'],
 *    },
 * 
 *    // Provide an update configuration to allow updating an entity.
 *    update: { 
 *      properties: ['name'], 
 *      requiredProperties: ['uuid'],
 *      dto: ['uuid', 'name'],
 *    },
 * 
 *    // Provide a delete configuration to allow deleting an entity.
 *    delete: true,
 * 
 *    // Enable debug mode to log the queries
 *    debug: true
 * });
 */
export default class CrudService {
    constructor(Model, foreignKeyName = '', options = {}) {

        let storageService;
        if (options.upload && options.upload.s3) {
            storageService = new StorageService(
                options.upload.s3.endpoint,
                options.upload.s3.region,
                options.upload.s3.credentials,
                options.upload.s3.bucketName,
                options.upload.s3.cdnURL,
                options.upload.s3.prefix
            );
        }

        if (options.find) {

            /**
             * @function find
             * @description Find a model by its primary key
             * @param {string} pk - The primary key
             * @param {string} include - The include parameter
             * @returns {Object} The found model
             * @example const result = await service.find('123', 'association');
             */
            this.find = async function (pk, include = null) {
                if (!pk) {
                    throw new ApiRequestError(`No ${foreignKeyName} provided.`, 400);
                }

                const query = { where: { [foreignKeyName]: pk } };

                if (include) {
                    query.include = include;
                }

                if (options.debug) console.log(`CrudService#${Model.name}#find = query =>`, query);

                const result = await Model.findOne(query);
                if (!result) {
                    throw new ApiRequestError(`No ${Model.name} found with ${foreignKeyName} ${pk}.`, 400);
                }

                if (include && result.dataValues[include]) {
                    result.dataValues[include] = Array.isArray(result.dataValues[include])
                        ? result.dataValues[include].map(r => r.dataValues)
                        : result.dataValues[include].dataValues;
                }

                /**
                 * If a specific DTO format is expected,
                 * convert the result to that format.
                 */
                if (options.find.dto) {
                    return CrudService.arrayToDto(options.find.dto, result.dataValues);
                }

                /**
                 * Otherwise, return the result as is.
                 */
                return result.dataValues;
            };
        }

        if (options.findAll) {
            /**
             * @function findAll
             * @description Find all models that match the query
             * @param {number} limit - The limit parameter
             * @param {number} page - The page parameter
             * @param {string} q - The search query
             * @param {Object} where - The where parameter
             * @param {Array} include - The include parameter
             * @returns {Object} The found models
             * @example const result = await service.findAll( 
             *   10, 
             *   1, 
             *   'hello world, 
             *   { name: 'Jens' },
             *   [
             *     { model: Model, as: 'Model', include: ['Association1', 'Association2']}
             *   ]
             * );
             */
            this.findAll = async function (limit, page = 1, q = null, where = null, include = null) {
                const query = {};

                query.limit = parseInt(limit) || options.findAll.defaultLimit || 10;

                if (page) page = parseInt(page);
                if (!page || page < 1) {
                    page = options.findAll.defaultPage || 1;
                }

                if (q) {
                    if (!options.findAll.searchProperties) {
                        throw new ApiRequestError('No search properties are defined.', 400);
                    }

                    query.where = {
                        $or: options.findAll.searchProperties.map(prop => ({ [prop]: { like: '%' + q + '%' } }))
                    }
                }

                if (where) {
                    for (let key in where) {
                        if (!options.findAll.whereProperties.includes(key)) {
                            throw new ApiRequestError(`Invalid where property ${key}.`, 400);
                        }
                    }

                    query.where = { ...query.where, ...where };
                }

                if (include) {
                    query.include = include;
                }

                if (options.debug) console.log(`CrudService#${Model.name}#findAll = query =>`, query);

                const offset = (page - 1) * query.limit;
                const count = await Model.count();
                const pages = Math.ceil(count / query.limit);
                const rows = await Model.findAll({ ...query, offset });

                /**
                 * Format the result to include the count and pages.
                 */
                const result = { count, pages, rows: rows.map(r => r.dataValues) };

                if (include) {
                    for (let ic of query.include) {
                        for (let i = 0; i < result.rows.length; i++) {
                            if (Array.isArray(result.rows[i][ic.as])) {
                                result.rows[i][ic.as] = Array.isArray(result.rows[i][ic.as])
                                    ? result.rows[i][ic.as].map(r => r.dataValues)
                                    : result.rows[i][ic.as].dataValues;
                            }
                        }
                    }
                }

                /**
                 * If a responseInclude parameter is provided,
                 * include the associated models in the response.
                 */
                if (options.findAll.dto) {
                    return { count, pages, rows: rows.map(r => CrudService.arrayToDto(options.findAll.dto, r)) };
                }

                /**
                 * Otherwise, return the result as is.
                 */
                return result;
            };
        }

        if (options.create) {

            /**
             * @function create
             * @description Create a new model
             * @param {Object} params - The request parameters
             * @param {Object} responseInclude - The response include parameter
             * @returns {Object} The created model
             * @example const result = await service.create( 
             *   {name: 'Jens'}
             *   [{ model: Model, as: 'Model', include: ['SubAssociation1', 'SubAssociation2']}]
             * );
             */
            this.create = async function (params = {}, responseInclude = null, files = null) {
                const properties = new ParamsBuilder(params, options.create.properties)
                    .filterProperties(options.create.properties)
                    .build();

                if (options.debug) console.log(`CrudService#${Model.name}#create = properties =>`, properties);

                let result = await Model.create(properties);

                /**
                 * If files are provided, upload them to the storage service.
                 */
                if (files) {
                    if (!options.upload) {
                        throw new ApiRequestError('No upload configuration provided.', 400);
                    }

                    const foreignKey = `${result.dataValues[foreignKeyName]}`;
                    const sources = {};
                    for (let i = 0; i < files.length; i++) {
                        const key = `${foreignKey}_${files[i].originalname}`;
                        const file = files[i];
                        const fileBuffer = file.buffer;
                        const fileUrl = storageService
                            ? await storageService.uploadFile(fileBuffer, key)
                            : await options.upload.customService.uploadFile(file, key);
                        
                        
                        sources[options.upload.fields[i]] = fileUrl;
                    }
                    result = await result.update(sources);
                }

                /**
                 * If a responseInclude parameter is provided,
                 * include the associated models in the response.
                 */
                if (responseInclude) {
                    result = await Model.findOne({
                        where: { [foreignKeyName]: result.dataValues[foreignKeyName] },
                        include: responseInclude
                    });

                    for (let ic of responseInclude) {
                        result.dataValues[ic.as] = Array.isArray(result.dataValues[ic.as])
                            ? result.dataValues[ic.as].map(r => r.dataValues)
                            : result.dataValues[ic.as].dataValues;
                    }
                }

                /**
                 * If a specific DTO format is expected,
                 * convert the result to that format.
                 */
                if (options.create.dto) {
                    return CrudService.arrayToDto(options.create.dto, result.dataValues);
                }

                /**
                 * Otherwise, return the result as is.
                 */
                return result.dataValues;
            };
        }

        if (options.update) {
            if (!options.update.requiredProperties) {
                options.update.requiredProperties = [];
            }

            /**
             * @function update
             * @description Update a new model
             * @param {string} foreignKey - The foreignKey
             * @param {Object} params - The request parameters
             * @param {Object} responseInclude - The response include parameter
             * @returns {Object} The updated model
             * @example const result = await service.update(
             *   123
             *   {name: 'Jens'},
             *   [{ model: Model, as: 'Model', include: ['SubAssociation1', 'SubAssociation2']}]
             * );
             */
            this.update = async function (foreignKey = '', params = {}, responseInclude = null, files = null) {
                const properties = new ParamsBuilder(params, options.update.requiredProperties)
                    .filterProperties(options.update.properties)
                    .build();

                if (options.debug) console.log(`CrudService#${Model.name}#update = properties =>`, properties);

                const entity = await Model.findOne({ where: { [foreignKeyName]: foreignKey } });
                if (!entity) {
                    throw new ApiRequestError(`No ${Model.name} found with ${foreignKeyName} ${foreignKey}.`, 400);
                }

                let result = await entity.update(properties);

                /**
                 * If files are provided, upload them to the storage service.
                 */
                if (files) {
                    if (!options.upload) {
                        throw new ApiRequestError('No upload configuration provided.', 400);
                    }

                    const sources = {};
                    for (let i = 0; i < files.length; i++) {  
                        const field = options.upload.fields[i];                       
                        const existingKey = storageService
                            ? storageService.parseKey(result.dataValues[field])
                            : options.upload.customService.parseKey(result);

                        const file = files[i];
                        const fileBuffer = file.buffer;
                        const fileUrl = storageService
                            ? await storageService.updateFile(fileBuffer, existingKey)
                            : await options.upload.customService.updateFile(file, existingKey);
                        
                        sources[field] = fileUrl;
                    }
                    result = await result.update(sources);
                }

                /**
                 * If a responseInclude parameter is provided,
                 * include the associated models in the response.
                 */
                if (responseInclude) {
                    result = await Model.findOne({
                        where: { [foreignKeyName]: foreignKey },
                        include: responseInclude
                    });

                    for (let ic of responseInclude) {
                        result.dataValues[ic.as] = Array.isArray(result.dataValues[ic.as])
                            ? result.dataValues[ic.as].map(r => r.dataValues)
                            : result.dataValues[ic.as].dataValues;
                    }
                }

                if (options.debug) console.log(`CrudService#${Model.name}#update = result =>`, result);

                /**
                 * If a specific DTO format is expected,
                 * convert the result to that format.
                 */
                if (options.update.dto) {
                    return CrudService.arrayToDto(options.update.dto, result.dataValues);
                }

                /**
                 * Otherwise, return the result as is.
                 */
                return result.dataValues;
            };
        }

        if (options.delete) {
            /**
             * @function destroy
             * @description Destroy a new model
             * @param {string} foreignKey - The foreignKey
             * @returns {void}
             * @example const result = await service.destroy(123);
             */
            this.destroy = async function (foreignKey = '') {
                if (!foreignKey) {
                    throw new ApiRequestError(`No ${foreignKeyName} provided.`, 400);
                }

                const result = await Model.findOne({ where: { [foreignKeyName]: foreignKey } });

                /**
                 * If the upload configuration is provided,
                 * delete the associated files from the storage service.
                 */
                if (options.upload) {
                    for (let i = 0; i < options.upload.fields.length; i++) {
                        const field = options.upload.fields[i];
                        const src = result.dataValues[field];
                        if (!src) continue;
                                        
                        const existingKey = storageService
                            ? storageService.parseKey(src)
                            : options.upload.customService.parseKey(src);

                        if (storageService) {
                            await storageService.deleteFile(existingKey);
                        } else {
                            await options.upload.customService.deleteFile(existingKey);
                        }
                    }
                }

                if (options.debug) console.log(`CrudService#${Model.name}#destroy = foreignKey =>`, foreignKey);

                /**
                 * Destroy the model with the given primary key.
                 */
                await result.destroy();
            };
        }
    }

    /**
     * @function arrayToDto
     * @description Convert an array of properties to a DTO object
     * @param {Array} properties - The properties to convert
     * @param {Object} body - The object to convert
     * @returns {Object} The DTO object
     */
    static arrayToDto(properties, body) {
        return properties.reduce((acc, key) => {
            acc[key] = body[key];
            return acc;
        }, {});
    }

    /**
     * @function buildOptions
     * @description Build the service options from the given options
     * @param {Object} options - The service options
     * @returns {Object} The service options
     */
    static buildOptions(options = {}) {
        const serviceOptions = {}

        if (options.upload) serviceOptions.upload = {
            fields: options.upload.fields,
            customService: options.upload.customService,
            s3: options.upload.s3
        };

        if (options.find) serviceOptions.find = {
            dto: options.find.dto
        };

        if (options.findAll) serviceOptions.findAll = {
            searchProperties: options.findAll.searchProperties,
            whereProperties: options.findAll.whereProperties,
            defaultLimit: options.findAll.defaultLimit,
            defaultPage: options.findAll.defaultPage,
            dto: options.findAll.dto
        };

        if (options.create) {
            serviceOptions.create = {
                properties: [...options.create.properties],
                dto: options.create.dto
            };
        }

        if (options.update) {
            serviceOptions.update = {
                properties: [...options.update.properties],
                requiredProperties: options.update.requiredProperties,
                dto: options.update.dto
            };
        }

        if (options.delete) serviceOptions.delete = true;
        if (options.debug) serviceOptions.debug = true;

        return serviceOptions;
    }
}
