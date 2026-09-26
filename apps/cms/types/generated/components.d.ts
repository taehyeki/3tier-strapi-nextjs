import type { Schema, Struct } from '@strapi/strapi';

export interface MenuLevel extends Struct.ComponentSchema {
  collectionName: 'components_menu_levels';
  info: {
    displayName: 'Level';
    icon: 'bulletList';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface MenuSize extends Struct.ComponentSchema {
  collectionName: 'components_menu_sizes';
  info: {
    displayName: 'Size';
    icon: 'priceTag';
  };
  attributes: {
    label: Schema.Attribute.Enumeration<['small', 'medium', 'large']> &
      Schema.Attribute.Required;
    noodleGrams: Schema.Attribute.Integer;
    price: Schema.Attribute.Integer & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'menu.level': MenuLevel;
      'menu.size': MenuSize;
    }
  }
}
