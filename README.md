# Web_NFC

ここの環境で
```npx http-server . -p 5173```
を実行し、目標達成したら
```git push```

クローンするとき以下を参考にして
https://zenn.dev/gachigachi/articles/329952348817d7

## サーバー起動方法
コマンドプロンプトで以下を入力
```npx serve .```


デバックするときは使用しているPCと同じネットワークにつなぎ、
https://localhost:3000
https://172.20.10.2:3000
を検索する。

## ブランチ作成手順
以下を参考にしてね
https://qiita.com/TetsuTaka/items/5ab227a8bd2cd7106833

1:ブランチを作成
git checkout -b 作成するブランチ名
2:ブランチをリモートに登録
git push -u origin 作成したブランチ名

ブランチの一覧を見る
git branch -a

## リモートにあるブランチをローカルに持ってくる（他人が作ったブランチをもってくる）
https://hato-it.hatenablog.com/entry/2021/08/08/111643

git fetch
git branch ブランチ名 origin/ブランチ名
git checkout ブランチ名