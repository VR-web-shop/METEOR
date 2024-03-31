import { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import SQLite from 'sqlite3';
import CrudService from '../src/CrudService.js';
import ParamsBuilder from '../src/ParamsBuilder.js';
import RestController from '../src/RestController.js';

const sequelize = new Sequelize('database', 'username', 'password', {
    dialect: 'sqlite',
    storage: 'path/to/database.sqlite', // or ':memory:'
    dialectOptions: {
        // Your sqlite3 options here
        // for instance, this is how you can configure the database opening mode:
        mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
    },
});



const options = { underscored: true, createdAt: 'created', updatedAt: 'updated' };
const Material = sequelize.define("Material", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

const Texture = sequelize.define("Texture", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

const Image = sequelize.define("Image", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

const TextureType = sequelize.define("TextureType", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

const MaterialTexture = sequelize.define("MaterialTexture", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

const MaterialType = sequelize.define("MaterialType", {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
}, options);

Material.belongsToMany(Texture, { through: MaterialTexture, as: 'Texture', foreignKey: 'material_uuid' });
Texture.belongsToMany(Material, { through: MaterialTexture, as: 'Material', foreignKey: 'texture_uuid' });
TextureType.hasMany(Texture, { foreignKey: 'texture_type_uuid' });
Texture.belongsTo(TextureType, { foreignKey: 'texture_type_uuid' });
Image.belongsTo(Texture, { foreignKey: 'texture_uuid' });
Texture.hasMany(Image, { foreignKey: 'texture_uuid' });
MaterialType.hasMany(Material, { foreignKey: 'material_type_uuid' });
Material.belongsTo(MaterialType, { foreignKey: 'material_type_uuid' });

try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    const textService = new CrudService(Texture, 'uuid', {
        find: {},
        findAll: {},
        create: { properties: ['texture_type_uuid'] },
        update: { properties: ['texture_type_uuid'] },
        delete: true
    });

    const imageService = new CrudService(Image, 'uuid', {
        find: {},
        findAll: {},
        create: { properties: ['texture_uuid'] },
        update: { properties: ['texture_uuid'] },
        delete: true
    });

    const texTypeService = new CrudService(TextureType, 'uuid', {
        find: {},
        findAll: {},
        create: { properties: [] },
        update: { properties: [] },
        delete: true
    });

    const matService = new CrudService(Material, 'uuid', {
        find: {},
        findAll: {},
        create: { properties: ['material_type_uuid'] },
        update: { properties: ['material_type_uuid'] },
        delete: true
    });

    const matTypeService = new CrudService(MaterialType, 'uuid', {
        find: {},
        findAll: {},
        create: { properties: [] },
        update: { properties: [] },
        delete: true
    });

    const texTypeParams = new ParamsBuilder({})
        .filterProperties([], 'body')
        .filterAssociations(TextureType, 'responseInclude', () => true)
        .build();
    const textureType = await texTypeService.create(
        texTypeParams.body,
        texTypeParams.responseInclude
    );
    const textureType2 = await texTypeService.create(
        texTypeParams.body,
        texTypeParams.responseInclude
    );

    const texureCreateParams = new ParamsBuilder({
            texture_type_uuid: textureType.uuid,
            responseInclude: 'TextureType'
        })
        .filterProperties(['texture_type_uuid'], 'body')
        .filterAssociations(Texture, 'responseInclude', () => false)
        .build();
    
    const texture = await textService.create(
        texureCreateParams.body,
        texureCreateParams.responseInclude
    );
    
    console.log('create texture params', texureCreateParams);
    console.log('create texture response', texture);

    const texureparams2 = new ParamsBuilder({
        uuid: texture.uuid,
        texture_type_uuid: textureType2.uuid,
        responseInclude: 'TextureType'
    }, ['uuid', 'texture_type_uuid'])
        .filterProperties(['uuid'])
        .filterProperties(['texture_type_uuid'], 'body')
        .filterAssociations(Texture, 'responseInclude', () => false)
        .build();
    console.log('params', texureparams2);
    console.log('update texureparams', await textService.update(
        texureparams2.uuid,
        texureparams2.body,
        texureparams2.responseInclude
    ));

    const params = new ParamsBuilder({ page: 1, limit: 10, include: 'TextureType' })
        .filterProperties(['page', 'limit', 'q', 'where'])
        .filterAssociations(Texture, 'include', () => !'TextureType')
        .build();
    console.log('params', params);
    //console.log('textService', await textService.find({ uuid: '1234' }));
    console.log('textService', await textService.findAll(
        params.limit,
        params.page,
        params.q,
        params.where,
        params.include
    ));

    const ImageParams = new ParamsBuilder({
            texture_uuid: texture.uuid,
            responseInclude: 'Texture'
        })
        .filterProperties(['texture_uuid'], 'body')
        .filterAssociations(Image, 'responseInclude', () => false)
        .build();
    const image = await imageService.create(
        ImageParams.body,
        ImageParams.responseInclude
    );
    console.log('create image params', ImageParams);
    console.log('create image response', image);

    const matTypeParams = new ParamsBuilder({})
        .filterProperties([], 'body')
        .filterAssociations(MaterialType, 'responseInclude', () => true)
        .build();
    const matType = await matTypeService.create(
        matTypeParams.body,
        matTypeParams.responseInclude
    );
    console.log('create matType params', matTypeParams);
    console.log('create matType response', matType);

    const matCreateParams = new ParamsBuilder({
            material_type_uuid: matType.uuid,
            responseInclude: 'MaterialType,Texture.TextureType:Images'
        })
        .filterProperties(['material_type_uuid'], 'body')
        .filterAssociations(Material, 'responseInclude', () => false)
        .build();
    const mat = await matService.create(
        matCreateParams.body,
        matCreateParams.responseInclude
    );
    console.log('create mat params', matCreateParams);
    console.log('create mat response', mat);

    MaterialTexture.create({ material_uuid: mat.uuid, texture_uuid: texture.uuid });

    const matUpdateParams = new ParamsBuilder({
            uuid: mat.uuid,
            material_type_uuid: matType.uuid,
            responseInclude: 'MaterialType,Texture.TextureType:Images'
        }, ['uuid', 'material_type_uuid'])
        .filterProperties(['uuid'])
        .filterProperties(['material_type_uuid'], 'body')
        .filterAssociations(Material, 'responseInclude', () => false)
        .build();
    console.log('params', matUpdateParams);
    console.log('update matparams', await matService.update(
        matUpdateParams.uuid,
        matUpdateParams.body,
        matUpdateParams.responseInclude
    ));

    const matFindParams = new ParamsBuilder({ uuid: mat.uuid}, ['uuid'])
        .filterProperties(['uuid'])
        .build();

    const findRes = await matService.find(matFindParams.uuid)
    console.log('find matparams', findRes)

    const matFindIncludeTexture = new ParamsBuilder({ uuid: mat.uuid, include: 'Texture'}, ['uuid'])
        .filterProperties(['uuid'])
        .filterAssociations(Material, 'include', () => false)
        .build();
    
    console.log('find matparams', await matService.find(matFindIncludeTexture.uuid, matFindIncludeTexture.include));

    const findAllParams = new ParamsBuilder({ page: 1, limit: 10 })
        .filterProperties(['page', 'limit', 'q', 'where'])
        .filterAssociations(Material, 'include', () => true)
        .build();

    console.log('findAll matparams', await matService.findAll(
        findAllParams.limit,
        findAllParams.page,
        findAllParams.q,
        findAllParams.where,
        findAllParams.include
    ));

    const matDeleteparams = new ParamsBuilder({ uuid: mat.uuid}, ['uuid'])
        .filterProperties(['uuid'])
        .build();

    console.log('delete matparams', await matService.destroy(matDeleteparams.uuid));


    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}