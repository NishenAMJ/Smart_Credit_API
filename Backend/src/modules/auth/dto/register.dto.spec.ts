import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegisterDto } from './register.dto';

const validRegistration = {
  fullName: 'Nimal Perera',
  email: 'nimal@example.com',
  phone: '0771234567',
  address: {
    line1: '10 Main Street',
    city: 'Colombo',
    district: 'Colombo',
    province: 'Western',
  },
  password: 'SmartPass123',
  role: 'borrower',
};

describe('RegisterDto Sri Lankan phone validation', () => {
  it.each(['0771234567', '+94 77 123 4567', '94771234567', '771234567'])(
    'accepts the supported Sri Lankan format %s',
    async (phone) => {
      const dto = plainToInstance(RegisterDto, {
        ...validRegistration,
        phone,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each(['07712345678', '071234567', '+94731234567', '+14155552671'])(
    'rejects the invalid or non-Sri Lankan number %s',
    async (phone) => {
      const dto = plainToInstance(RegisterDto, {
        ...validRegistration,
        phone,
      });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'phone')).toBe(true);
    },
  );
});

describe('RegisterDto email validation', () => {
  it.each([
    'nimalgmail.com',
    '@gmail.com',
    'nimal@gmail',
    'nimal gamage@gmail.com',
    'nimal@gmail..com',
    'nimal..gamage@gmail.com',
    'nimal@gmail-.com',
  ])('rejects the malformed email %s', async (email) => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegistration,
      email,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});
