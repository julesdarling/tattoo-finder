import rawRecords from './records.json';
import rawMetadata from './data-metadata.json';
import { TattooDatasetSchema } from '../lib/schema';

export const tattooRecords = TattooDatasetSchema.parse(rawRecords);
export const dataMetadata = rawMetadata;
