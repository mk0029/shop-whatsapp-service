const axios = require('axios');
const { expect } = require('chai');

describe('API Tests for Local Dummy Messages', () => {
    it('should return a success response for dummy message 1', async () => {
        const response = await axios.post('http://localhost:3000/api/messages', { message: 'dummy message 1' });
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
    });

    it('should return a success response for dummy message 2', async () => {
        const response = await axios.post('http://localhost:3000/api/messages', { message: 'dummy message 2' });
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
    });
});