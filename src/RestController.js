import CrudAPI from './CrudAPI.js';
import ApiRequestError from './ApiRequestError.js';
import CrudService from './CrudService.js';
import express from 'express';

/**
 * @function RestController
 * @description A class that generates a RESTful controller for a given sequelize model.
 * @example new RestController('/users', 'id', userModel {
 * 
 *   // Not providing a find options, means neither a route or service method will be generated.
 *   find: { 
 *      // The middleware applied to the find route
 *      middleware: Function[], 
 * 
 *      // The association routes that should be allowed for this resource 
 *      // (fx /user/:id/AssociationName - returns both user and association)
 *      includes: [{ endpoint: string, model: string }],
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 *   },
 * 
 *   // Not providing a findAll options, means neither a route or service method will be generated.
 *   findAll: { 
 *      // The middleware applied to the findAll route
 *      middleware: Function[], 
 * 
 *      // The properties that should be searchable
 *      searchProperties: string[],
 * 
 *      // The default limit for the findAll route
 *      defaultLimit: number,
 * 
 *      // The default page for the findAll route
 *      defaultPage: number,
 * 
 *      // The association routes that should be allowed for this resource.
 *      // Note: associations can be included in the same findAll route by 
 *      // including {include: 'AssociationName'} in the body. 
 *      includes: string[]
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 *   },
 * 
 *   // Not providing a create options, means neither a route or service method will be generated.
 *   create: { 
 *      // The middleware applied to the create route
 *      middleware: Function[],
 *    
 *      // The properties that are required to create a new entity
 *      properties: string[] 
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 *   },
 * 
 *   // Not providing a update options, means neither a route or service method will be generated.
 *   update: { 
 *      // The middleware applied to the update route
 *      middleware: Function[],
 * 
 *      // The properties that can be updated
 *      properties: string[], 
 * 
 *      // The properties that are required to update an entity
 *      // Can just be an empty array for all allowed properties defined in the 'properties'-array.
 *      requiredProperties: string[] 
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 *   },
 * 
 *   // Not providing a delete options, means neither a route or service method will be generated.
 *   delete: { 
 *      // The middleware applied to the delete route
 *      middleware: Function[]
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 *   }
 * });
 */
function RestController(endpoint, pkName, sequelizeModel, options={}) {
    if (!endpoint) throw new Error('No endpoint provided.');
    if (!pkName) throw new Error('No primary key name provided.');
    if (!sequelizeModel) throw new Error('No sequelizeModel provided.');
    if (!options) throw new Error('No options provided.');

    const serviceOptions = CrudService.buildOptions(options);
    const service = new CrudService(sequelizeModel, pkName, serviceOptions)
    const router = express.Router();

    if (options.find && !options.find.serviceOnly) {
        router.route(`${endpoint}/:${pkName}`)
            .get(options.find.middleware, async (req, res) => {
                const pk = req.params[pkName];
                if (!pk) {
                    return res.status(400).send(`No ${pkName} provided.`);
                }

                try {
                    const entity = await service.find({[pkName]: pk});
                    if (!entity) {
                        return res.status(404).send(`No entity found with ${pkName} ${pk}.`);
                    }

                    return res.send(entity);
                } catch (e) {
                    if (e instanceof ApiRequestError) {
                        return res.status(e.status).send(e.message);
                    }

                    console.error(e);
                    return res.status(500).send("Internal server error.");
                }
            });
    }

    if (options.find && options.find.includes && !options.find.serviceOnly) {
        for (let include of options.find.includes) {
            const { endpoint: includeEndpoint, model: includeModel } = include;

            router.route(`${endpoint}/:${pkName}/${includeEndpoint}`)
                .get(options.find.middleware, async (req, res) => {
                    const pk = req.params[pkName];
                    if (!pk) {
                        return res.status(400).send(`No ${pkName} provided.`);
                    }

                    try {
                        const entity = await service.find({[pkName]: pk}, {include: includeModel});
                        if (!entity) {
                            return res.status(404).send(`No entity found with ${pkName} ${pk}.`);
                        }
    
                        return res.send(entity);
                    } catch (e) {
                        if (e instanceof ApiRequestError) {
                            return res.status(e.status).send(e.message);
                        }
    
                        console.error(e);
                        return res.status(500).send("Internal server error.");
                    }
                });
        }
    }

    if (options.findAll && !options.findAll.serviceOnly) {
        router.route(endpoint)        
            .get(options.findAll.middleware, async (req, res) => {
                try {
                    const { page, limit, q, include } = req.query;
                    
                    if (include && !options.findAll.includes ||
                        include && options.findAll.includes && !options.findAll.includes.includes(include)) {
                        return res.status(400).send(`No allowed association found with name ${include}.`);
                    }

                    const { count, pages, rows } = await service.findAll({page, limit, q}, {include});
                    return res.send({ count, pages, rows });
                } catch (e) {
                    if (e instanceof ApiRequestError) {
                        return res.status(e.status).send(e.message);
                    }

                    console.error(e);
                    return res.status(500).send("Internal server error.");
                }
            })
    }

    if (options.create && !options.create.serviceOnly) {
        router.route(endpoint)    
            .post(options.create.middleware, async (req, res) => {
                const properties = {}
                for (let key of options.create.properties) {
                    if (!req.body[key]) {
                        return res.status(400).send(`No ${key} provided.`);
                    }

                    properties[key] = req.body[key];
                }

                try {
                    const entity = await service.create(properties);
                    return res.send(entity);
                } catch (e) {
                    if (e instanceof ApiRequestError) {
                        return res.status(e.status).send(e.message);
                    }

                    console.error(e);
                    return res.status(500).send("Internal server error.");
                }
            })
    }

    if (options.update && !options.update.serviceOnly) {
        router.route(endpoint)  
            .put(options.update.middleware, async (req, res) => {
                const pk = req.body[pkName];
                if (!pk) {
                    return res.status(400).send(`No ${pkName} provided.`);
                }

                const requiredProperties = options.update.requiredProperties || [];
                for (let key of requiredProperties) {
                    if (!req.body[key]) {
                        return res.status(400).send(`No ${key} provided.`);
                    }
                }

                try {
                    const properties = { [pkName]: pk };
                    for (let key of options.create.properties) {
                        if (req.body[key]) properties[key] = req.body[key];
                    }

                    const entity = await service.update(properties);
                    return res.send(entity);
                } catch (e) {
                    if (e instanceof ApiRequestError) {
                        return res.status(e.status).send(e.message);
                    }

                    console.error(e);
                    return res.status(500).send("Internal server error.");
                }
            })
    }

    if (options.delete && !options.delete.serviceOnly) {
        router.route(endpoint)  
            .delete(options.delete.middleware, async (req, res) => {
                const pk = req.body[pkName];
                if (!pk) {
                    return res.status(400).send(`No ${pkName} provided.`);
                }
                
                try {
                    await service.destroy({[pkName]: pk});
                    return res.sendStatus(204);
                } catch (e) {
                    if (e instanceof ApiRequestError) {
                        return res.status(e.status).send(e.message);
                    }

                    console.error(e);
                    return res.status(500).send("Internal server error.");
                }
            });
    }

    /**
     * @function generateCrudAPI
     * @description Generates a CRUD API for the given endpoint.
     * @param {string} serverURL - The URL of the server.
     * @param {string} authorization - The authorization token to use for the API.
     * @returns {CrudAPI} The generated CRUD API.
     * @example const api = generateCrudAPI('http://localhost:3000', { storage: 'localStorage', key: 'auth' });
     * @example const api = generateCrudAPI('http://localhost:3000', { storage: 'memory', token: 'YOUR_TOKEN' });
     */
    const generateCrudAPI = (serverURL, authorization=null) => {
        const apiOptions = CrudAPI.buildOptions({ authorization, ...options }, authorization !== null);
        return new CrudAPI(serverURL, endpoint, pkName, apiOptions);
    }

    return {router, service, generateCrudAPI};
}

export default RestController;
