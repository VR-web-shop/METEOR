import { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import SQLite from 'sqlite3';
import CrudService from '../src/CrudService.js';

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
        find: {  },
        findAll: {  },
        create: { properties: ['texture_type_uuid'] },
        update: { properties: ['texture_type_uuid'] },
        delete: true
    });

    const imageService = new CrudService(Image, 'uuid', {
        find: {  },
        findAll: {  },
        create: { properties: ['texture_uuid'] },
        update: { properties: ['texture_uuid'] },
        delete: true
    });

    const texTypeService = new CrudService(TextureType, 'uuid', {
        find: {  },
        findAll: {  },
        create: { properties: [] },
        update: { properties: [] },
        delete: true
    });
    
    const matService = new CrudService(Material, 'uuid', {
        find: {  },
        findAll: { },
        create: { properties: ['material_type_uuid'] },
        update: { properties: ['material_type_uuid'] },
        delete: true
    });

    const matTypeService = new CrudService(MaterialType, 'uuid', {
        find: {  },
        findAll: {  },
        create: { properties: [] },
        update: { properties: [] },
        delete: true
    });

    const matType = await matTypeService.create({});
    const texType = await texTypeService.create({});
    const tex = await textService.create({ texture_type_uuid: texType.uuid });
    const img = await imageService.create({ texture_uuid: tex.uuid });
    const mat = await matService.create({ uuid: '1234', material_type_uuid: matType.uuid });

    await MaterialTexture.create({material_uuid: mat.uuid, texture_uuid: tex.uuid});
    const all = await matService.findAll({q: 'a9'}, { include: 'Texture.TextureType:Images,MaterialType' });
    console.log(JSON.stringify(all, null, 2));

    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}