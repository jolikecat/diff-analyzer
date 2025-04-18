const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const beforeDir = './before';
const afterDir = './after';
const outputDir = './output';

// outputディレクトリ初期化
if (fs.existsSync(outputDir)) {
	fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir);

const deleteLog = [];
const diffLog = [];

// 隠しファイル・ディレクトリを無視する再帰処理
function walkDir(dir, base = '') {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let outputs = [];

	for (const entry of entries) {
		// . で始まるものはスキップ
		if (entry.name.startsWith('.')) continue;

		const fullPath = path.join(dir, entry.name);
		const relativePath = path.join(base, entry.name);

		if (entry.isDirectory()) {
			outputs = outputs.concat(walkDir(fullPath, relativePath));
		} else {
			outputs.push(relativePath);
		}
	}
	return outputs;
}

// ファイル一覧取得（隠しファイル・ディレクトリ無視）
const beforeFiles = walkDir(beforeDir);
const afterFiles = walkDir(afterDir);

const beforeSet = new Set(beforeFiles);
const afterSet = new Set(afterFiles);

// 削除されたファイル
for (const file of beforeFiles) {
	if (!afterSet.has(file)) {
		deleteLog.push(file);
	}
}

// 追加・変更ファイル
for (const file of afterFiles) {
	const beforePath = path.join(beforeDir, file);
	const afterPath = path.join(afterDir, file);

	if (!fs.existsSync(beforePath)) {
		// 新規ファイル
		diffLog.push(`${file}`);
	} else {
		try {
			execSync(`diff -q "${beforePath}" "${afterPath}"`);
		} catch (err) {
			// 変更ファイル
			diffLog.push(`${file}`);
		}
	}
}

// 出力
fs.writeFileSync('./logs/non-existent.txt', deleteLog.join('\n'));
fs.writeFileSync('./logs/diff.txt', diffLog.join('\n'));

// diffファイルを output にコピー
diffLog.forEach((file) => {
	const src = path.join(afterDir, file);
	const dest = path.join(outputDir, file);
	const destDir = path.dirname(dest);

	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	fs.copyFileSync(src, dest);
});

console.log('done.');
