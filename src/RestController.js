import CrudAPI from './CrudAPI.js';
import ApiRequestError from './ApiRequestError.js';
import CrudService from './CrudService.js';
import StorageService from './StorageService.js';
import ParamsBuilder from './ParamsBuilder.js';
import express from 'express';
import multer from "multer";

/**
 * @function RestController
 * @description A class that generates a RESTful controller for a given sequelize model.
 * @example new RestController('/users', 'id', userModel {
 * 
 *   // Provide an upload configuration to allow file uploads for the entity.
 *   upload: {
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
 *   },
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
 *      // The properties that should be allowed to use 'WHERE' to find
        whereProperties: string[],
 * 
 *      // The default limit for the findAll route
 *      defaultLimit: number,
 * 
 *      // The default page for the findAll route
 *      defaultPage: number,
 * 
 *      // The association routes that should be allowed for this resource.
 *      // Note: associations can be included in the same findAll route by 
 *      // including {include: {model: 'AssociationName'}} in the body. 
 *      includes: Object[]
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
 *      properties: string[],
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean
 * 
 *      // A custom method that can be used to create a custom entity
 *      // if the default service method is not sufficient
 *      customMethod: (req, res, params) => any,
 * 
 *      // A custom response function that can be used to return a custom response
 *      customResponse: (entity: any) => any,
 * 
 *      // Hooks that can be used to run custom code before or after the operation
 *      hooks: {
 *         before: (req, res, params) => void,
 *         after: (req, res, params, entity) => void
 *      },
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
 *      requiredProperties: string[],
 * 
 *      // Specify a DTO to transform the avoid leaking sensitive information
 *      dto: { parameter1: string, parameter2: string },
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean,
 * 
 *      // A custom method that can be used to create a custom entity
 *      // if the default service method is not sufficient
 *      customMethod: (req, res, params) => any,
 * 
 *      // A custom response function that can be used to return a custom response
 *      customResponse: (entity: any) => any,
 * 
 *      // Hooks that can be used to run custom code before or after the operation
 *      hooks: {
 *         before: (req, res, params) => void,
 *         after: (req, res, params, entity) => void
 *      },
 *   },
 * 
 *   // Not providing a delete options, means neither a route or service method will be generated.
 *   delete: { 
 *      // The middleware applied to the delete route
 *      middleware: Function[]
 * 
 *      // If no route is requred, but you still want the service method, add serviceOnly: true
 *      serviceOnly: boolean,
 * 
 *      // A custom method that can be used to create a custom entity
 *      // if the default service method is not sufficient
 *      customMethod: (req, res, params) => any,
 * 
 *      // A custom response function that can be used to return a custom response
 *      customResponse: () => any,
 * 
 *      // Hooks that can be used to run custom code before or after the operation
 *      hooks: {
 *         before: (req, res, params) => void,
 *         after: (req, res, params, foreignKeyValue) => void
 *      },
 *   },
 * 
 *   debug: boolean
 * });
 */
function RestController(endpoint, pkName, sequelizeModel, options = {}) {
    if (!endpoint) throw new Error('No endpoint provided.');
    if (!pkName) throw new Error('No primary key name provided.');
    if (!sequelizeModel) throw new Error('No sequelizeModel provided.');
    if (!options) throw new Error('No options provided.');

    const uploadMW = multer({ storage: multer.memoryStorage() })
    const serviceOptions = CrudService.buildOptions(options);
    const service = new CrudService(sequelizeModel, pkName, serviceOptions)
    const router = express.Router();

    if (options.debug) {
        console.log(`RestController#${sequelizeModel.name}#options =`, options);
        console.log(`RestController#${sequelizeModel.name}#serviceOptions =`, serviceOptions);
    }

    if (options.find && !options.find.serviceOnly) {
        router.route(`${endpoint}/:${pkName}`)
            .get(options.find.middleware, async (req, res) => {

                try {
                    const params = new ParamsBuilder(req.params, [pkName])
                        .filterProperties([pkName])
                        .build();
                    if (options.debug) console.log(`RestController#${sequelizeModel.name}#find = params =>`, params);
                    const entity = await service.find(params[pkName]);
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

                    try {
                        const params = new ParamsBuilder(req.params, [pkName])
                            .filterProperties([pkName])
                            .filterAssociation(sequelizeModel, includeModel)
                            .build();
                        if (options.debug) console.log(`RestController#${sequelizeModel.name}#find#${includeModel} = params =>`, params);
                        const entity = await service.find(params[pkName], includeModel);
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
                    const params = new ParamsBuilder(req.query)
                        .filterProperties(['page', 'limit', 'q'])
                        .filterStringObjectArray('where', 'where', () => !req.query.where)
                        .filterAssociations(sequelizeModel, 'include', () => !req.query.include)
                        .build();
                    if (options.debug) console.log(`RestController#${sequelizeModel.name}#findAll = params =>`, params);
                    const { count, pages, rows } = await service.findAll(
                        params.limit,
                        params.page,
                        params.q,
                        params.where,
                        params.include
                    );

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
        const middleware = options.upload
            ? [uploadMW.array(options.upload.fields), ...options.create.middleware]
            : options.create.middleware;

        router.route(endpoint)
            .post(middleware, async (req, res) => {
                try {
                    const params = new ParamsBuilder(req.body, options.create.properties)
                        .filterProperties(options.create.properties, 'body')
                        .filterAssociations(sequelizeModel, 'responseInclude', () => !req.body.responseInclude)
                        .build();

                    if (options.create.hooks && options.create.hooks.before) options.create.hooks.before(req, res, params);
                    if (options.debug) console.log(`RestController#${sequelizeModel.name}#create = params =>`, params);

                    let entity;
                    if (options.create.customMethod) {
                        entity = await options.create.customMethod(req, res, params);
                    } else {
                        entity = await service.create(params.body, params.responseInclude, req.files);
                    }

                    if (options.create.hooks && options.create.hooks.after) options.create.hooks.after(req, res, params, entity);

                    if (options.create.customResponse)
                        return res.send(await options.create.customResponse(entity));
                    else return res.send(entity);

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
        const middleware = options.upload
            ? [uploadMW.array(options.upload.fields), ...options.update.middleware]
            : options.update.middleware;

        router.route(endpoint)
            .put(middleware, async (req, res) => {
                try {
                    const required = [pkName];

                    if (options.update.requiredProperties) {
                        required.push(...options.update.requiredProperties);
                    }

                    const params = new ParamsBuilder(req.body, required)
                        .filterProperties([pkName])
                        .filterProperties(options.update.properties, 'body')
                        .filterAssociations(sequelizeModel, 'responseInclude', () => !req.body.responseInclude)
                        .build();

                    if (options.update.hooks && options.update.hooks.before) options.update.hooks.before(req, res, params);
                    if (options.debug) console.log(`RestController#${sequelizeModel.name}#update = params =>`, params);

                    let entity;
                    if (options.update.customMethod) {
                        entity = await options.update.customMethod(req, res, params);
                    } else {
                        entity = await service.update(params[pkName], params.body, params.responseInclude, req.files);
                    }

                    if (options.update.hooks && options.update.hooks.after) options.update.hooks.after(req, res, params, entity);

                    if (options.update.customResponse)
                        return res.send(await options.update.customResponse(entity));
                    else return res.send(entity);

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
                try {
                    const params = new ParamsBuilder(req.body, [pkName])
                        .filterProperties([pkName])
                        .build();

                    if (options.delete.hooks && options.delete.hooks.before) options.delete.hooks.before(req, res, params);
                    if (options.debug) console.log(`RestController#${sequelizeModel.name}#delete = params =>`, params);
                    
                    if (options.delete.customMethod) {
                        await options.delete.customMethod(req, res, params);
                    } else {
                        await service.destroy(params[pkName]);
                    }

                    if (options.delete.hooks && options.delete.hooks.after) options.delete.hooks.after(req, res, params, params[pkName]);
                    
                    if (options.delete.customResponse)
                        return res.send(await options.delete.customResponse());
                    else return res.sendStatus(204);
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
    const generateCrudAPI = (serverURL, authorization = null) => {
        const apiOptions = CrudAPI.buildOptions({ authorization, ...options }, authorization !== null);
        return new CrudAPI(serverURL, endpoint, pkName, apiOptions);
    }

    return { router, service, generateCrudAPI };
}

export default RestController;
