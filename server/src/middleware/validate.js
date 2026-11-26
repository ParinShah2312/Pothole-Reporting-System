import { badRequest } from '../utils/httpError.js';

/** Validates req[source] against a Zod schema and attaches parsed data back cleanly. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source] ?? {});
    if (parsed.success) {
      req[source] = parsed.data;
      return next();
    }
    const details = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'body';
      if (!details[key]) details[key] = issue.message;
    }
    return next(badRequest('Please fix the highlighted fields', details));
  };
}
