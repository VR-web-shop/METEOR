# METEOR ☄️
(Model Express Toolkit for Efficient ORM REST-APIs) ☄️

METEOR is a powerful npm package that simplifies the process of building RESTful APIs with Express.js and Sequelize ORM. With METEOR, you can quickly generate complete code for your API endpoints, making API development faster and more efficient.

[![Node.js Package Publish](https://github.com/VR-web-shop/METEOR/actions/workflows/npm-publish-github-packages.yml/badge.svg?branch=release)](https://github.com/VR-web-shop/METEOR/actions/workflows/npm-publish-github-packages.yml)

## Features

- **Streamlined API Development**: METEOR provides a single method that automates the generation of most of the code required for setting up Express routes with your Sequelize models, reducing the time and effort needed to build APIs.
  
- **Integration with Sequelize**: Seamlessly leverage the features of Sequelize ORM to interact with your database, define models, and manage data relationships.
  
- **Opinionated yet Flexible**: METEOR follows best practices and conventions, allowing for consistency and maintainability in your codebase. However, it also offers flexibility to customize configurations according to your project requirements.
  
- **Efficient Performance**: Designed with efficiency in mind, METEOR optimizes API performance and scalability, ensuring that your applications can handle high loads and respond quickly to requests.

## Installation

Install via terminal:
```
$ npm install @vr-web-shop/meteor@1.0.12
```

Install via package.json:
```
"@vr-web-shop/meteor": "1.0.12"
```

Find the latest version at https://github.com/VR-web-shop/METEOR/pkgs/npm/meteor

## Usage
The package provides four important classes/functions `RestController`, `CrudService`, `BuildAPISDK`, and `CrudAPI`.

### RestController
RestController can be used to generate an API to read and write data from Sequelize models.
The method depends returns an `Express Router` object, a `CrudService` object (Internal class), and a method called `generateCrudAPI`. 

- The `Express Router` object can be passed to an instance of an Express application to enable the routes on the application.

- `CrudService` can be used to read and write to the database using the generated service layer directly.

- `generateCrudAPI` can be used to create an instance of `CrudAPI` (Internal class), which contains a layer of methods calling the express routes using the `fetch` method.

```js
import meteor from "@vr-web-shop/meteor";

const controller = meteor.RestController(endpoint: string, foreign_key_name: string, model: SequelizeModel, {
    
    // Not providing a find options, means neither a route or service method will be generated.
    find: { 
        // The middleware applied to the find route
        middleware: Function[], 

        // The association routes that should be allowed for this resource 
        // (fx /user/:id/AssociationName - returns both user and association)
        includes: [{ endpoint: string, model: string }],

        // Specify a DTO to transform the avoid leaking sensitive information
        dto: { parameter1: string, parameter2: string },

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean
    },

    // Not providing a findAll options, means neither a route or service method will be generated.
    findAll: { 
        // The middleware applied to the findAll route
        middleware: Function[], 

        // The properties that should be searchable
        searchProperties: string[],

        // The properties that should be allowed to use 'WHERE' to find
        whereProperties: string[],

        // The default limit for the findAll route
        defaultLimit: number,

        // The default page for the findAll route
        defaultPage: number,

        // The association routes that should be allowed for this resource.
        // Note: associations can be included in the same findAll route by 
        // including {include: 'AssociationName'} in the body. 
        includes: string[]

        // Specify a DTO to transform the avoid leaking sensitive information
        dto: { parameter1: string, parameter2: string },

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean
    },

    // Not providing a create options, means neither a route or service method will be generated.
    create: { 
        // The middleware applied to the create route
        middleware: Function[],

        // The properties that are required to create a new entity
        properties: string[],

        // Specify a DTO to transform the avoid leaking sensitive information
        dto: { parameter1: string, parameter2: string },

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean

        // A custom response function that can be used to return a custom response
        customResponse: (entity: any) => any
    },

    // Not providing a update options, means neither a route or service method will be generated.
    update: { 
        // The middleware applied to the update route
        middleware: Function[],

        // The properties that can be updated
        properties: string[], 

        // The properties that are required to update an entity
        // Can just be an empty array for all allowed properties defined in the 'properties'-array.
        requiredProperties: string[],

        // Specify a DTO to transform the avoid leaking sensitive information
        dto: { parameter1: string, parameter2: string },

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean

        // A custom response function that can be used to return a custom response
        customResponse: (entity: any) => any
    },

    // Not providing a delete options, means neither a route or service method will be generated.
    delete: { 
        // The middleware applied to the delete route
        middleware: Function[],

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean
    },

    // Provide a boolean name debug to get debugging info
    debug: boolean
});

// You now have access to an Express router containing the defined routes, a service instance
// where you can call the methods directly without using the API routes, and a method to
// generate a fetch API for the routes for your frontend.
const { router, service, generateCrudAPI } = controller;
```

### Example
Create the API for a resource called `Material` and a belong-through association called `Texture`.
```js
import meteor from "@vr-web-shop/meteor";
import express from 'express'

// This should be a model defined with Sequelize (https://sequelize.org/)
import Material from './models/Material.js'

const controller = meteor.RestController(`api/v1/materials`, 'uuid', Material, {
    find: { includes: [{ endpoint: 'textures', model: 'Texture' }], middleware: [] },
    findAll: { includes: [ 'Texture' ], middleware: [] },
    create: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    update: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    delete: { middleware: [] }
})

const { router, service, generateCrudAPI } = controller;

// Add the routes to the server
const app = express();
app.use(router)
app.listen(3000, () => console.log('Running on port 3000'))

/**
 * That's it. You should now have access to the following routes:
 * GET /api/v1/materials/:uuid 
 * GET /api/v1/materials/:uuid/textures
 * GET /api/v1/materials - options: {
 *  limit: integer, 
 *  page: integer, q: 
 *  string, 
 *  includes: string
 * }
 * 
 * POST /api/v1/materials - body: {
 *  name: string, 
 *  description: string, 
 *  material_type_name: string
 * }
 * 
 * UPDATE /api/v1/materials - body: {
 *  name: string, 
 *  description: string, 
 *  material_type_name: string
 * }
 * 
 * DELETE /api/v1/materials - body: {
 *  uuid: string
 * }
 */

// If you also wanted an API to fetch your routes from the frontend,
// use the generateCrudAPI function returned from the RestController function.
const materialsFetchAPI = generateCrudAPI("http://localhost:3000", {storage: 'memory', token: 'YOUR_TOKEN'});
materialsFetchAPI.find({uuid: 1}, {include: 'Texture'})
materialsFetchAPI.findAll({limit: 5, page: 1, include: 'Texture'})
materialsFetchAPI.create({ name: 'Red Fabric', description: 'Some description ...', material_type_name: 'MeshBasicMaterial'})
materialsFetchAPI.update({ uuid: 2, name: 'New Name', description: 'New description ...', material_type_name: 'MeshPhysicalMaterial'})
materialsFetchAPI.destroy({ uuid: 2 })

```

### CrudService
The `CrudService` class can be used to generate a service layer for a Sequelize model. The class has the following public methods:

- `find(params, methodOptions)` - Find a single record of the model.
- `findAll(params, methodOptions)` - Paginate or search the model.
- `create(params)` - Create a new record of the model.
- `update(params)` - Update an record of the model.
- `destroy(params)` - Delete an record of the model.

```js
import meteor from "@vr-web-shop/meteor";

const service = new meteor.CrudService(model: SequelizeModel, foreign_key_name: string, {

    // Not providing the find option will not create the find method
    find: { 
        dto: string[] 
    },
    
    // Not providing the findAll option will not create the findAll method
    findAll: {
        searchProperties: string[],
        whereProperties: string[],
        defaultLimit: number,
        defaultPage: number,
        dto: string[]
    },

    // Not providing the create option will not create the create method
    create: {
        properties: string[],
        dto: string[]
    },

    // Not providing the update option will not create the update method
    update: {
        properties: string[],
        requiredProperties: string[],
        dto: string[]
    },

    // Not providing the destroy option will not create the destroy method
    delete: boolean,

    // Provide a boolean name debug to get debugging info
    debug: boolean
});

```

### Example
Create a service class for a resource called `Material` and a belong-through association called `Texture`.
```js
import meteor from "@vr-web-shop/meteor";

// This should be a model defined with Sequelize (https://sequelize.org/)
import Material from './models/Material.js'

const service = new meteor.CrudService(Material, 'uuid', {
    find: { dto: [ 'name', 'description', 'material_type_name' ] },
    findAll: { dto: [ 'name', 'description', 'material_type_name' ] },
    create: { properties: [ 'name', 'description', 'material_type_name' ] },
    update: { properties: [ 'name', 'description', 'material_type_name' ] },
    delete: true
})

// Find material
const material = service.find({uuid: '...'}, {include: 'Texture'})

// Paginate materials
const {count, rows, pages} = service.findAll({limit: 5, page: 1}, {include: 'Texture'})

// Create material
service.create({name: 'Red fabric', description: 'Some description...', material_type_name: 'MeshBasicMaterial'})

// Update material
service.update({uuid: '...', description: 'new description'})

// Delete material
service.delete({uuid: '...'})
```

### CrudAPI
The `CrudAPI` class can be used to generate methods for the API for the frontend. The class has the following public methods:
- `setAuthorizationOptions(newOptions)` - Set the authorization options to something else after instantiation.
- `find(params, methodOptions)` - Paginate or search the model.
- `findAll(params)` - Paginate or search the model.
- `create(params)` - Create a new record of the model.
- `update(params)` - Update an record of the model.
- `destroy(params)` - Delete an record of the model.

```js
import meteor from "@vr-web-shop/meteor";

const fetchAPI = new meteor.CrudAPI(serverURL: string, endpoint: string, foreignKeyName: string, {

    // Optional, use it if you the endpoint require authentication.
    authorization: {
        /**
         * Two types of authorization token is supported:
         * - 'localStorage' - Tells the system to get the token from localStorage (only works in the browser)
         * - 'memory' - Tells the system to store the token in a variable until the instance is destroyed.
         */
        storage: string,

        // Specify the key where the token is stored in local storage in the browser. Use together with the 'localStorage' storage option.
        key: string

        // Specify the token that should be stored in memory. Use together with the 'memory' storage option. 
        token: string
    },

    // Not providing the delete option will not create the delete method
    find: {

        // Define if the authorization header should be provided.
        auth: boolean
    },

    // Not providing the delete option will not create the delete method
    findAll: {

        // Define if the authorization header should be provided.
        auth: boolean
    },

    // Not providing the delete option will not create the delete method
    create: {

        // Define if the authorization header should be provided.
        auth: boolean,

        // Define the properties that should be included in the request.
        properties: string[],
    },

    // Not providing the delete option will not create the delete method
    update: {

        // Define if the authorization header should be provided.
        auth: boolean,

        // Define the optional properties that should be included in the request.
        properties: string[],

        // Define the required properties that should be included in the request.
        requiredProperties: string[]
    },

    // Not providing the delete option will not create the delete method
    delete: {
        // Define if the authorization header should be provided.
        auth: boolean
    }
});

```

### Example
Create a `CrudAPI` class for a resource called `Material`.
```js
import meteor from "@vr-web-shop/meteor";

const api = new meteor.CrudAPI('http://localhost:3000', '/api/v1/materials', 'uuid', {
    authorization: { storage: 'localStorage', key: 'auth' },
    find: { auth: true },
    findAll: { auth: true },
    create: { auth: true, properties: ['name', 'email'] },
    update: { auth: true, properties: ['name', 'email'] },
    delete: { auth: true }
})

// Change authorization method
api.setAuthorizationOptions({ storage: 'memory', token: 'YOUR_TOKEN' })

// Find material
const material = api.find({uuid: '...'}, {include: 'textures'})

// Paginate materials
const {count, rows, pages} = api.findAll({limit: 5, page: 1}, {include: 'Texture'})

// Create material
api.create({name: 'Red fabric', description: 'Some description...', material_type_name: 'MeshBasicMaterial'})

// Update material
api.update({uuid: '...', description: 'new description'})

// Delete material
api.delete({uuid: '...'})
```

## BuildAPISDK
The `BuildAPISDK` function can be used to generate a sdk file from an array of controllers.
```js
import meteor from "@vr-web-shop/meteor";

BuildAPISDK(filePath: string, serverURL: string, controllers: Array<meteor.RestController>[])
```

### Example

```js
import meteor from "@vr-web-shop/meteor";

// Create the controller
const controller = meteor.RestController(`api/v1/materials`, 'uuid', Material, {
    find: { includes: [{ endpoint: 'textures', model: 'Texture' }], middleware: [] },
    findAll: { includes: [ 'Texture' ], middleware: [] },
    create: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    update: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    delete: { middleware: [] }
})

// Save the SDK file
BuildAPISDK('./sdk.js', 'http://localhost:3000', [controller])
```
