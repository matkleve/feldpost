import { describe, expect, it } from 'vitest';
import { DEFAULT_FILE_TYPE_GROUPS } from './upload-panel-file-type-groups';
import {
  DEFAULT_UPLOAD_FILE_INPUT_ACCEPT,
  acceptForUploadFileTypeGroup,
  buildUploadFileInputAccept,
} from './upload-panel-file-accept';

describe('upload-panel-file-accept', () => {
  it('DEFAULT_UPLOAD_FILE_INPUT_ACCEPT includes all intake extensions', () => {
    expect(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT).toContain('image/jpeg');
    expect(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT).toContain('video/mp4');
    expect(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT).toContain('application/pdf');
    expect(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT).toContain('.docx');
    expect(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT).toContain('text/csv');
  });

  it('buildUploadFileInputAccept filters to a single extension', () => {
    const accept = buildUploadFileInputAccept(['jpg']);
    expect(accept).toContain('.jpg');
    expect(accept).toContain('image/jpeg');
    expect(accept).not.toContain('image/png');
    expect(accept).not.toContain('video/mp4');
  });

  it('acceptForUploadFileTypeGroup includes only group members', () => {
    const images = DEFAULT_FILE_TYPE_GROUPS.find((group) => group.id === 'images');
    expect(images).toBeDefined();
    const accept = acceptForUploadFileTypeGroup(images!);
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('image/png');
    expect(accept).not.toContain('video/mp4');
    expect(accept).not.toContain('application/pdf');
  });
});
