import { Container, Service } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

export const TopLevelController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			target as unknown as Controller,
		);
		metadata.basePath = basePath;
		metadata.absoluteBasePath = true;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
