import { parse } from 'url';
import { API, SsmContainer } from 'ssm-shared-lib';
import { BadRequestError, InternalError, NotFoundError } from '../../middlewares/api/ApiError';
import { SuccessResponse } from '../../middlewares/api/ApiResponse';
import ContainerRepo from '../../data/database/repository/ContainerRepo';
import asyncHandler from '../../middlewares/AsyncHandler';
import { filterByFields, filterByQueryParams } from '../../helpers/query/FilterHelper';
import { paginate } from '../../helpers/query/PaginationHelper';
import { sortByFields } from '../../helpers/query/SorterHelper';
import WatcherEngine from '../../modules/docker/core/WatcherEngine';
import ContainerUseCases from '../../use-cases/ContainerUseCases';

export const getContainers = asyncHandler(async (req, res) => {
  const realUrl = req.url;
  const { current = 1, pageSize = 10 } = req.query;
  const params = parse(realUrl, true).query as unknown as API.PageParams &
    API.Container & {
      sorter: any;
      filter: any;
      deviceUuid?: string;
    };
  const containers = (await ContainerRepo.findAll()) as API.Container[];
  // Add pagination
  let dataSource = paginate(containers, current as number, pageSize as number);
  // Use the separated services
  dataSource = sortByFields(dataSource, params);
  dataSource = filterByFields(dataSource, params);
  let deviceUuid = undefined;
  try {
    // @ts-expect-error TODO: change the type
    deviceUuid = params.device ? JSON.parse(params.device).uuid : undefined;
  } catch {}
  //TODO: update validator
  dataSource = filterByQueryParams(
    dataSource.map((e) => ({ ...e, deviceUuid: e.device?.uuid })),
    { ...params, deviceUuid: deviceUuid },
    ['status', 'name', 'updateAvailable', 'deviceUuid'],
  );

  new SuccessResponse('Get containers', dataSource, {
    total: dataSource.length,
    success: true,
    pageSize,
    current: parseInt(`${params.current}`, 10) || 1,
  }).send(res);
});

export const postCustomNameOfContainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customName } = req.body;
  const container = await ContainerRepo.findContainerById(id);
  if (!container) {
    throw new NotFoundError(`Container with id ${id} not found`);
  }
  await ContainerUseCases.updateCustomName(customName, container);
  new SuccessResponse('Updated container', {}).send(res);
});

export const refreshAll = asyncHandler(async (req, res) => {
  try {
    await Promise.all(
      Object.values(WatcherEngine.getStates().watcher).map((watcher) => watcher.watch()),
    );
    new SuccessResponse('refreshed all containers', {}).send(res);
  } catch (e: any) {
    throw new InternalError(`Error when watching images (${e.message})`);
  }
});

export const postContainerAction = asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const container = await ContainerRepo.findContainerById(id);
  if (!container) {
    throw new NotFoundError(`Container with id ${id} not found`);
  }
  if (!(Object.values(SsmContainer.Actions) as string[]).includes(action)) {
    throw new BadRequestError();
  }
  const result = await ContainerUseCases.performAction(container, action as SsmContainer.Actions);
  new SuccessResponse('Performed container action', result).send(res);
});
