import { Delivery, deliveryProblems, newOrderId } from '../orders';

const good: Delivery = {
  name: 'Иван Иванов',
  phone: '+7 (900) 123-45-67',
  city: 'Казань',
  address: 'ул. Баумана, 1, кв. 2',
};

describe('deliveryProblems', () => {
  it('passes a filled-in address', () => {
    expect(deliveryProblems(good)).toEqual([]);
  });

  it('names every empty field', () => {
    expect(deliveryProblems({ name: '', phone: '', city: '', address: '' })).toEqual([
      'name',
      'phone',
      'city',
      'address',
    ]);
  });

  it('counts the digits in a phone, not the punctuation around them', () => {
    expect(deliveryProblems({ ...good, phone: '8 900 123 45 67' })).toEqual([]);
    expect(deliveryProblems({ ...good, phone: '+7 (900) 12' })).toEqual(['phone']);
  });

  it('does not accept whitespace as a name', () => {
    expect(deliveryProblems({ ...good, name: '   ' })).toEqual(['name']);
  });

  it('lets the comment be left out', () => {
    expect(deliveryProblems({ ...good, comment: undefined })).toEqual([]);
  });
});

describe('newOrderId', () => {
  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 200 }, newOrderId));
    expect(ids.size).toBe(200);
  });
});
