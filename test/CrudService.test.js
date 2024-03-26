import { expect, test, beforeAll } from 'vitest'
import SequelizeMock from 'sequelize-mock'
import CrudService from '../src/CrudService.js'

let Material, Texture;

beforeAll(async () => {
    const DBConnectionMock = new SequelizeMock();
    const options = {};

    Material = DBConnectionMock.define("Material", {
        uuid: '00000000-0000-0000-0000-000000000000',
        name: 'Material',
    }, options);

    Texture = DBConnectionMock.define("Texture", {
        uuid: '00000000-0000-0000-0000-000000000000',
    }, options);

    Texture.belongsTo(Material, { foreignKey: 'material_uuid', as: 'Material' });
    Material.hasMany(Texture, { foreignKey: 'material_uuid', as: 'Textures' });

    Material.create();
    Texture.create();

    Material.count = () => 1;
    Texture.count = () => 1;
    Material.update = async (params) => {
        return new Promise((resolve, reject) => {
            resolve({ dataValues:{
                uuid: '00000000-0000-0000-0000-000000000000',
                name: params.name,
            }});
        });
    }
})

test('Material should be defined', () => {
    expect(Material).toBeDefined()
})

test('CrudService should be defined', () => {
    expect(CrudService).toBeDefined()
})

test('CrudService should not define functions if none options was provided', () => {
    const materialService = new CrudService(Material, 'uuid', {});

    expect(materialService).toBeDefined();
    expect(materialService.find).toBeUndefined();
    expect(materialService.findAll).toBeUndefined();
    expect(materialService.create).toBeUndefined();
    expect(materialService.update).toBeUndefined();
    expect(materialService.destroy).toBeUndefined();
})

test('CrudService should define functions if an option for the function was provided', () => {
    const materialServiceFind = new CrudService(Material, 'uuid', { find: {} });
    const materialServiceFindAll = new CrudService(Material, 'uuid', { findAll: {} });
    const materialServiceCreate = new CrudService(Material, 'uuid', { create: {} });
    const materialServiceUpdate = new CrudService(Material, 'uuid', { update: {} });
    const materialServiceDestroy = new CrudService(Material, 'uuid', { delete: {} });

    expect(materialServiceFind).toBeDefined();
    expect(materialServiceFindAll).toBeDefined();
    expect(materialServiceCreate).toBeDefined();
    expect(materialServiceUpdate).toBeDefined();
    expect(materialServiceDestroy).toBeDefined();

    expect(materialServiceFind.find).toBeDefined();
    expect(materialServiceFindAll.findAll).toBeDefined();
    expect(materialServiceCreate.create).toBeDefined();
    expect(materialServiceUpdate.update).toBeDefined();
    expect(materialServiceDestroy.destroy).toBeDefined();
})

test('CrudService#find should return a material if the pk is provided', async () => {
    const materialService = new CrudService(Material, 'uuid', { find: true });
    const material = await materialService.find('00000000-0000-0000-0000-000000000000');

    expect(material).toBeDefined();
    expect(material.uuid).toBe('00000000-0000-0000-0000-000000000000');
})

test('CrudService#find should throw an error if the pk is not provided', async () => {
    const materialService = new CrudService(Material, 'uuid', { find: true });

    await expect(() => materialService.find()).rejects.toThrowError('No uuid provided');
})

test('CrudService#findAll should return all materials', async () => {
    const materialService = new CrudService(Material, 'uuid', { findAll: true });
    const { count, rows, pages} = await materialService.findAll();

    expect(count).toBe(1);
    expect(rows).toBeDefined();
    expect(pages).toBeDefined();
})

test('CrudService#create should create a material', async () => {
    const materialService = new CrudService(Material, 'uuid', { create: { properties: ['name']} });
    const material = await materialService.create({ name: 'Material 2' });

    expect(material).toBeDefined();
    expect(material.uuid).toBe('00000000-0000-0000-0000-000000000000');
    expect(material.name).toBe('Material 2');
})

test('CrudService#create should throw an error if the required property is not provided', async () => {
    const materialService = new CrudService(Material, 'uuid', { create: { properties: ['name']} });

    await expect(() => materialService.create()).rejects.toThrowError('No name provided');
})

test('CrudService#update when providing no requiredProperties option, everything should be updateable', async () => {
    const materialService = new CrudService(Material, 'uuid', {
        find: true,
        update: { properties: ['name'] }
    });
    const material = await materialService.update(
        '00000000-0000-0000-0000-000000000000', 
        { name: 'Material 3' }
    );

    expect(material).toBeDefined();
    expect(material.uuid).toBe('00000000-0000-0000-0000-000000000000');
    expect(material.name).toBe('Material 3');
})

test('CrudService#update should update a material', async () => {
    const materialService = new CrudService(Material, 'uuid', { 
        find: true,
        update: { properties: ['name'], requiredProperties: []} 
    });
    const material = await materialService.update(
        '00000000-0000-0000-0000-000000000000', 
        { name: 'Material 3' }
    );

    expect(material).toBeDefined();
    expect(material.uuid).toBe('00000000-0000-0000-0000-000000000000');
    expect(material.name).toBe('Material 3');
})

test('CrudService#update should throw an error if the required property is not provided', async () => {
    const materialService = new CrudService(Material, 'uuid', { 
        find: true,
        update: { properties: ['name'], requiredProperties: ['name']} 
    });

    await expect(() => materialService.update('00000000-0000-0000-0000-000000000000', {})).rejects.toThrowError('No name provided');
})

test('CrudService#destroy should destroy material and return void', async () => {
    const materialService = new CrudService(Material, 'uuid', { find: true, delete: true });
    
    await expect(materialService.destroy('00000000-0000-0000-0000-000000000000')).resolves.toBeUndefined();
})
