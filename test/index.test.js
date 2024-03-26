import { expect, test } from 'vitest'
import index from '../index.js'

test('index should be defined', () => {
    expect(index).toBeDefined()
})

test('index.RestController should be defined', () => {
    expect(index.RestController).toBeDefined()
})

test('index.CrudService should be defined', () => {
    expect(index.CrudService).toBeDefined()
})

test('index.CrudAPI should be defined', () => {
    expect(index.CrudAPI).toBeDefined()
})

test('index.BuildAPISDK should be defined', () => {
    expect(index.BuildAPISDK).toBeDefined()
})



