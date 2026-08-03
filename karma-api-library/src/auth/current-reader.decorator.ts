import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentReader = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest().reader,
);

export const CurrentSession = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest().sessionId,
);

export const CurrentAccount = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest().account,
);
