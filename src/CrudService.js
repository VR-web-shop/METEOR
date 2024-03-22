import ApiRequestError from './ApiRequestError.js';

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
 *    delete: true
 * });
 */
export default class CrudService {
    constructor(Model, foreignKeyName = '', options = {}) {
        if (options.find) {
            this.find = async function (params, methodOptions={}) {
                const pk = params[foreignKeyName];
                if (!pk) {
                    throw new ApiRequestError(`No ${foreignKeyName} provided.`, 400);
                }

                let includeModel;
                if (methodOptions.include) {
                    includeModel = methodOptions.include;

                    const associations = Object.values(Model.associations);
                    if (!associations.find(a => a.as === includeModel)) {
                        throw new ApiRequestError(`No association found with name ${includeModel}. Possible associations are: ${associations.map(a => a.as).join(', ')};`, 400);
                    }
                }

                const result = includeModel 
                    ? await Model.findOne({ where: { [foreignKeyName]: pk }, include: includeModel })
                    : await Model.findByPk(pk);


                if (options.find.dto) {
                    return CrudService.arrayToDto(options.find.dto, result);
                }

                return result;
            };
        }

        if (options.findAll) {
            this.findAll = async function (params, methodOptions={}) {
                const q = params.q;
                if (q && options.findAll.searchProperties) {
                    return await Model.findAll({
                        where: {
                            $or: options.findAll.searchProperties.map(prop => ({ [prop]: { like: '%' + q + '%' } }))
                        }
                    });
                }

                let includeModels;
                if (methodOptions.include) {
                    includeModels = methodOptions.include.split(',');

                    const associations = Object.values(Model.associations);
                    for (let includeModel of includeModels)
                        if (!associations.find(a => a.as === includeModel)) {
                            throw new ApiRequestError(`No association found with name ${includeModel}. Possible associations are: ${associations.map(a => a.as).join(', ')};`, 400);
                        }
                    }
                }

                let where;
                if (params.where) {
                    where = params.where;
                    
                    if (!options.findAll.whereProperties || !options.findAll.whereProperties.every(prop => Object.keys(where).includes(prop))) {
                        throw new ApiRequestError(`Invalid where properties. Possible properties are: ${options.findAll.whereProperties.join(', ')};`, 400);
                    }
                }

                const limit = parseInt(params.limit) || options.findAll.defaultLimit || 10;
                const page = parseInt(params.page) || options.findAll.defaultPage || 1;
                
                const offset = (page - 1) * limit;
                const count = await Model.count();
                const pages = Math.ceil(count / limit);

                const findOptions = { limit, offset };
                if (includeModels) findOptions.include = includeModels;
                if (where) findOptions.where = where;
                const rows = await Model.findAll(findOptions)

                const result = { count, pages, rows: rows.map(r=>r.dataValues) };
                
                if (options.findAll.dto) {
                    return {count, pages, rows: rows.map(r=>CrudService.arrayToDto(options.findAll.dto, r))};
                }

                return result;
            };
        }

        if (options.create) {
            this.create = async function (params) {
                for (let key of options.create.properties) {
                    if (!params[key]) {
                        throw new ApiRequestError(`No ${key} provided.`, 400);
                    }
                }

                const properties = options.create.properties.reduce((acc, key) => {
                    acc[key] = params[key];
                    return acc;
                }, {});

                const result = await Model.create(properties);

                if (options.create.dto) {
                    return CrudService.arrayToDto(options.create.dto, result);
                }

                return result;
            };
        }

        if (options.update) {
            this.update = async function (params) {
                if (options.update.requiredProperties) {
                    for (let key of options.update.requiredProperties) {
                        if (!params[key]) {
                            throw new ApiRequestError(`No ${key} provided.`, 400);
                        }
                    }
                }

                const pk = params[foreignKeyName];
                if (!pk) {
                    throw new ApiRequestError(`No ${foreignKeyName} provided.`, 400);
                }

                const model = await Model.findByPk(pk);
                if (!model) {
                    throw new ApiRequestError(`No ${Model.name} found with ${foreignKeyName} ${pk}.`, 400);
                }

                const properties = {};
                for (let key of options.update.properties) {
                    if (params[key]) properties[key] = params[key];
                }
                
                const result = await model.update(properties);

                if (options.update.dto) {
                    return CrudService.arrayToDto(options.update.dto, result);
                }

                return result;
            };
        }

        if (options.delete) {
            this.destroy = async function (params) {
                const pk = params[foreignKeyName];
                if (!pk) {
                    throw new ApiRequestError(`No ${foreignKeyName} provided.`, 400);
                }

                await Model.destroy({ where: { [foreignKeyName]: pk } });
            };
        }
    }

    static arrayToDto(properties, body) {
        return properties.reduce((acc, key) => {
            acc[key] = body[key];
            return acc;
        }, {});
    }

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
        
        return serviceOptions;
    }
}
