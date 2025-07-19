![Release version](https://img.shields.io/badge/version-v1.0.03-blue)
Latest release: [<!--LATEST_VERSION-->v1.0.03<!--/LATEST_VERSION-->](https://github.com/RyOkEeeesh/pong/releases/latest)

# PONG v1.0.03
##  PONGについて
誰もが一度はやったことがあると思うピンポンゲームを、Threejsを使って作りました。
今はベータ版ですが、9月末までには全体を完成させたいです。

## 仕様
- メニュー 

  ゲーム選択画面の後ろで、ゲームがプレイされいい演出になるので、CPU同士を戦わせています。

- シングルモード

  一人でもゲームを楽しめるように、3つの難易度のCPUを用意しました。

- デュオモード

  ひとつのデバイスで、2人が遊べます。

- マルチモード

  オンラインで遊べるよう、今後、IO21の自由制作課題で制作します。

## 操作方法
- ```A``` ```W``` ```←```* ```↑```* : 左または上に移動 ( * : デュオモードのみ )
- ```D``` ```S``` ```→```* ```↓```* : 右または下に移動 ( * : デュオモードのみ )
- ```Space``` ```Enter```*　: サーブ発射 ( * : デュオモードのみ )
- ```Q``` ```E``` : カメラ切り替え ( シングルモードのみ )

## DEMO
- メニュー
  - [CPU vs CPU](https://ryokeeeesh.github.io/pong/)

- シングルモード
  - [Player vs CPU Easy](https://ryokeeeesh.github.io/pong/?mode=1&cpu=0)
  - [Player vs CPU Normal](https://ryokeeeesh.github.io/pong/?mode=1&cpu=1)
  - [Player vs CPU Hard](https://ryokeeeesh.github.io/pong/?mode=1&cpu=2)

- デュオモード
  - [Player vs Player](https://ryokeeeesh.github.io/pong/?mode=2)

## 今後の展開
- 個人設定の追加

  Cookieを使用し操作方法や、ユーザ名などを設定できるようにします。

- メニュー画面制作

  ゲームのモードを選択できるメニューを作成します

- マルチモード

  Node.jsでWebSocketを使用し、リアルタイム通信を可能とするとともに、ユーザに楽しい体験を提供できるようにしたいと思います。また、複数人は入れるようにし、観戦や観戦者がプレイヤーに邪魔できる機能などを追加したいと思います。

## 質問について
質問は[こちら](https://github.com/RyOkEeeesh/pong/issues)から、```question```のラベルを付け、issueを作成してください。
また、デバック情報などがあるが相も[こちら](https://github.com/RyOkEeeesh/pong/issues)からお願いします。

## 参考
- [ヒカキンさんの動画](https://youtu.be/sQFQPH5IL2Y?si=HVLRD1YNcXh95-Y8)