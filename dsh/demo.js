/**
 * 演示档案播种（M5）。把 buildDemoProfiles()（唯一数据源，D10）写进用户资料库。
 *
 * 语义（ZERO-TO-DEV §2.1 第 2 步）：
 * - 幂等：库里已有 subjects（profile 行）就整批跳过，不叠加、不重置；
 * - 单事务：writeDemoToDb 内部一个事务，任一 INSERT 失败整体回滚；
 * - 数据源零复制：直接 import demo/build-demo-data.mjs 的 finalize()，不在本文件重抄数据。
 */
import { finalize, writeDemoToDb } from '../demo/build-demo-data.mjs';

/**
 * @param {import('node:sqlite').DatabaseSync} db 已迁移的库
 * @returns {{seeded: boolean, profiles?: number}} seeded=false 表示库里已有档案，本次跳过
 */
export function seedDemo(db) {
  const has = db.prepare('SELECT COUNT(*) AS n FROM profile').get().n;
  if (has > 0) return { seeded: false };
  const data = finalize();
  writeDemoToDb(db, data);
  return { seeded: true, profiles: data.profiles.length };
}

/** 空库才播种（服务启动用；与 seedDemo 同一判据，保留两个名字方便对齐家族叫法）。 */
export function seedIfEmpty(db) {
  return seedDemo(db);
}
