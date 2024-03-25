import { expect, test, beforeAll } from 'vitest'
import SequelizeMock from 'sequelize-mock'
import ParamsBuilder from '../src/ParamsBuilder.js'

let Material, Texture, Image, TextureType;

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

    TextureType = DBConnectionMock.define("TextureType", {
        uuid: '00000000-0000-0000-0000-000000000000',
    }, options);

    Image = DBConnectionMock.define("Image", {
        uuid: '00000000-0000-0000-0000-000000000000',
    }, options);

    Material.associations = [
        { model: Texture, as: 'Texture', target: Texture },
        { model: Image, as: 'Image', target: Image }
    ];
    Texture.associations = [
        { model: Material, as: 'Material', target: Material },
        { model: Image, as: 'Image', target: Image },
        { model: TextureType, as: 'TextureType', target: TextureType }
    ];
    TextureType.associations = [
        { model: Texture, as: 'Texture', target: Texture }
    ];
    Image.associations = [
        { model: Material, as: 'Material', target: Material },
        { model: Texture, as: 'Texture', target: Texture }
    ];
})

test('ParamsBuilder should be defined', () => {
    expect(ParamsBuilder).toBeDefined()
})

test('ParamsBuilder should throw an error if a required property is not provided', () => {
    expect(() => new ParamsBuilder({}, ['property1'])).toThrow()
})

test('ParamsBuilder#filterProperties should filter the properties', () => {
    const params = { property1: 'value1', property2: 'value2' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterProperties(['property1']).build()

    expect(output).toEqual({ property1: 'value1' })
})

test('ParamsBuilder#filterStringObjectArray should filter a string object array', () => {
    const params = { keyName: 'key1:value1,key2:value2' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterStringObjectArray('keyName', 'prefix').build()

    expect(output).toEqual({ prefix: { key1: 'value1', key2: 'value2' } })
})

test('ParamsBuilder#filterStringObjectArray should skip if a condition is met', () => {
    const params = { keyName: 'key1:value1,key2:value2' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterStringObjectArray('keyName', 'prefix', () => true).build()

    expect(output).toEqual({})
})

test('ParamsBuilder#filterAssociation should return the association if it is a valid association', () => {
    const params = { association: 'association' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterAssociation(Material, 'Texture').build()

    expect(output).toEqual({ include: 'Texture' })
})

test('ParamsBuilder#filterAssociation should throw an error if the association is not valid', () => {
    const params = { association: 'association' }
    const builder = new ParamsBuilder(params)
    expect(() => builder.filterAssociation(Material, 'NotAssociated')).toThrowError('No association found with name NotAssociated');
})

test('ParamsBuilder#filterAssociation should skip if a condition is met', () => {
    const params = { association: 'association' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterAssociation(Material, 'Texture', () => true).build()

    expect(output).toEqual({})
})

test('ParamsBuilder#filterAssociations should return the associations if they are valid', () => {
    const params = { include: 'Texture.Image:TextureType,Image' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterAssociations(Material, 'include').build()
 
    expect(output).toEqual({ include: [
        {
            as: "Texture", 
            model: Texture, 
            include: [
                { as: "Image", model: Image },
                { as: "TextureType", model: TextureType }
            ]
        },
        { as: "Image", model: Image }
    ]})
})

test('ParamsBuilder#filterAssociations should throw an error if the associations are not valid', () => {
    const params = { include: 'NotAssociated' }
    const builder = new ParamsBuilder(params)
    expect(() => builder.filterAssociations(Material, 'include')).toThrowError('Invalid association: NotAssociated');
})

test('ParamsBuilder#filterAssociations should skip if a condition is met', () => {
    const params = { include: 'Texture' }
    const builder = new ParamsBuilder(params)
    const output = builder.filterAssociations(Material, 'include', () => true).build()

    expect(output).toEqual({})
})

test('ParamsBuilder#build should return the outputParams', () => {
    const params = { property1: 'value1', property2: 'value2' }
    const builder = new ParamsBuilder(params)
        .filterProperties(['property1'])
    const output = builder.build()

    expect(output).toEqual(builder.outputParams)
    expect(output).toEqual({ property1: 'value1' })
})
