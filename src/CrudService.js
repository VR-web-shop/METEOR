import ApiRequestError from './ApiRequestError.js';
import ParamsBuilder from './ParamsBuilder.js';

/**
 * @class CrudService
 * @classdesc A class that generates CRUD services for a given Sequelize model.
 * @example new CrudService(Model, 'uuid', {
 *    find: { 
 *      dto: ['uuid', 'name'] 
 *    },
 *    findAll: { 
 *      searchProperties: ['name'], 
 *      whereProperties: ['name'],
 *      defaultLimit: 10, 
 *      defaultPage: 1, 
 *      dto: ['uuid', 'name']
 *    },
 *    create: {
 *      properties: ['name'],
 *      dto: ['uuid', 'name']
 *    },
 *    update: { 
 *      properties: ['name'], 
 *      requiredProperties: ['uuid'],
 *      dto: ['uuid', 'name'] 
 *    },
 *    delete: true,
 *    debug: true
 * });
 */
export default class CrudService {
    constructor(Model, foreignKeyName = '', options = {}) {
        if (options.find) {

            /**
             * @function find
             * @description Find a model by its primary key
             * @param {string} pk - The primary key
             * @param {string} include - The include parameter
             * @returns {Object} The found model
             * @example const result = await service.find('123', 'association');
             */
            this.find = async function (pk, include=null) {
                const query = { where: { [foreignKeyName]: pk } };

                if (include) {
                    query.include = include;
                }
                
                if (options.debug) console.log(`CrudService#${Model.name}#find = query =>`, query);
                
                const result = await Model.findOne(query);
                if (!result) {
                    throw new ApiRequestError(`No ${Model.name} found with ${foreignKeyName} ${pk}.`, 400);
                }

                if (include) {
                    for (let ic of query.include) {
                        result.dataValues[ic.as] = Array.isArray(result.dataValues[ic.as])
                            ? result.dataValues[ic.as].map(r=>r.dataValues)
                            : result.dataValues[ic.as].dataValues;
                    }
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
            this.findAll = async function (limit, page=1, q=null, where=null, include=null) {
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
                    for (let key of where) {
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
                const result = { count, pages, rows: rows.map(r=>r.dataValues) };

                if (include) {
                    for (let ic of query.include) {
                        for (let i = 0; i < result.rows.length; i++) {
                            if (Array.isArray(result.rows[i][ic.as])) {
                                result.rows[i][ic.as] = Array.isArray(result.rows[i][ic.as]) 
                                    ? result.rows[i][ic.as].map(r=>r.dataValues) 
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
                    return {count, pages, rows: rows.map(r=>CrudService.arrayToDto(options.findAll.dto, r))};
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
            this.create = async function (params, responseInclude=null) {
                const properties = new ParamsBuilder(params, options.create.properties)
                    .filterProperties(options.create.properties)
                    .build();
                    
                if (options.debug) console.log(`CrudService#${Model.name}#create = properties =>`, properties);

                let result = await Model.create(properties);
                
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
                            ? result.dataValues[ic.as].map(r=>r.dataValues) 
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
            this.update = async function (foreignKey='', params={}, responseInclude=null) {
                const properties = new ParamsBuilder(params, options.update.requiredProperties)
                    .filterProperties(options.update.properties)
                    .build();
                
                if (options.debug) console.log(`CrudService#${Model.name}#update = properties =>`, properties);

                /**
                 * Update the model with the given properties.
                 */
                let result = await Model.update(properties,
                    { where: { [foreignKeyName]: foreignKey } }
                );

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
                            ? result.dataValues[ic.as].map(r=>r.dataValues) 
                            : result.dataValues[ic.as].dataValues;
                    }
                }

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
            this.destroy = async function (foreignKey='') {

                if (options.debug) console.log(`CrudService#${Model.name}#destroy = foreignKey =>`, foreignKey);

                /**
                 * Destroy the model with the given primary key.
                 */
                await Model.destroy({ where: { [foreignKeyName]: foreignKey } });
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
    static buildOptions(options={}) {
        const serviceOptions = {}

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

        if (options.create) serviceOptions.create = { 
            properties: options.create.properties,
            dto: options.create.dto 
        };

        if (options.update) serviceOptions.update = { 
            properties: options.update.properties,
            requiredProperties: options.update.requiredProperties,
            dto: options.update.dto
        };

        if (options.delete) serviceOptions.delete = true;
        if (options.debug) serviceOptions.debug = true;
        
        return serviceOptions;
    }
}
