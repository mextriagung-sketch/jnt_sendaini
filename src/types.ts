/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  address?: string;
  resi: string;
  status: 'pending' | 'sent';
  timestamp?: string;
}

export interface AppSettings {
  autoSync: boolean;
}
