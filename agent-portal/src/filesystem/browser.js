/**
 * Filesystem Browser – REST API for file operations
 *
 * Provides endpoints for browsing, reading, writing files on the VM.
 * Both the user (via the UI) and the agent (via tools) can access these.
 */

const fs = require("fs");
const path = require("path");
const mime = require("mime-types");