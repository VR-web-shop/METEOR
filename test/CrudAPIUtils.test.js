import { expect, test } from 'vitest'
import CrudAPIUtils from '../src/CrudAPIUtils.js'

test('CrudAPIUtils should be defined', () => {
    expect(CrudAPIUtils).toBeDefined()
})

test('CrudAPIUtils#getWhereString should return a url safe string', () => {
    const where = CrudAPIUtils.getWhereString({ property1: 'value1', property2: 'value2' })

    expect(where).toBe('property1:value1,property2:value2')
})

test('CrudAPIUtils#getIncludeString should return a url safe string', () => {
    const include = CrudAPIUtils.getIncludeString([
        { model: 'Texture' },
        { model: 'Image' },
        { model: 'TextureType' }
    ])

    expect(include).toBe('Texture,Image,TextureType')
})


test('CrudAPIUtils#getIncludeString should return a url safe string with nested includes', () => {
    const include = CrudAPIUtils.getIncludeString([{ model: 'Texture', include: ['Image', 'TextureType'] }])

    expect(include).toBe('Texture.Image:TextureType')
})
