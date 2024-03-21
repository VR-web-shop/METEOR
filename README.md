# METEOR ☄️
(Model Express Toolkit for Efficient ORM REST-APIs) ☄️

METEOR is a powerful npm package that simplifies the process of building RESTful APIs with Express.js and Sequelize ORM. With METEOR, you can quickly generate complete code for your API endpoints, making API development faster and more efficient.

[![Node.js Package Publish](https://github.com/VR-web-shop/METEOR/actions/workflows/npm-publish-github-packages.yml/badge.svg)](https://github.com/VR-web-shop/METEOR/actions/workflows/npm-publish-github-packages.yml)

## Features

- **Streamlined API Development**: METEOR provides a single method that automates the generation of most of the code required for setting up Express routes with your Sequelize models, reducing the time and effort needed to build APIs.
  
- **Integration with Sequelize**: Seamlessly leverage the features of Sequelize ORM to interact with your database, define models, and manage data relationships.
  
- **Opinionated yet Flexible**: METEOR follows best practices and conventions, allowing for consistency and maintainability in your codebase. However, it also offers flexibility to customize configurations according to your project requirements.
  
- **Efficient Performance**: Designed with efficiency in mind, METEOR optimizes API performance and scalability, ensuring that your applications can handle high loads and respond quickly to requests.

## Usage
Instantiate a new RestController with the options you need.
```js
const controller = RestController(endpoint: string, foreign_key_name: string, model: SequelizeModel {
    
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
    },

    // Not providing a delete options, means neither a route or service method will be generated.
    delete: { 
        // The middleware applied to the delete route
        middleware: Function[],

        // If no route is requred, but you still want the service method, add serviceOnly: true
        serviceOnly: boolean
    }
});

// You now have access to an Express router containing the defined routes, and a service instance
// where you can call the methods directly without using the API routes.
const { router, service } = controller;
```

## Example
```js
import express from 'express'

// This should be a model defined with Sequelize (https://sequelize.org/)
import Material from './models/Material.js'

const controller = RestController(`api/v1/materials`, 'uuid', Material, {
    find: { includes: [{ endpoint: 'textures', model: 'Texture' }], middleware: [] },
    findAll: { includes: [ 'Texture' ], middleware: [] },
    create: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    update: { properties: [ 'name', 'description', 'material_type_name' ], middleware: [] },
    delete: { middleware: [] }
})

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
```
