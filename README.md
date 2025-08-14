<!--HEADER-->
![Release version](https://img.shields.io/badge/version-<!--THIS_VERSION-->v0.0.0<!--/THIS_VERSION-->-blue) Latest release: [<!--LATEST_VERSION-->v0.0.0<!--/LATEST_VERSION-->](https://github.com/RyOkEeeesh/pong/releases/latest)

# PONG <!--THIS_VERSION-->v0.0.0<!--/THIS_VERSION-->
<!--/HEADER-->

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

## ルール
- 点数

  11点マッチ、20点までデュースありです。

  マッチポイント時、点数が点滅するエフェクトがかかります。

  ゲーム終了時、勝者のポイントが点滅するエフェクトがかかります。

- サーブ権

  サーブ兼保有者は自分の好きな場所とタイミングで、ボールを発射することができます。 

  失点した人がサーブ権を保有し、最初はランダムでサーブ権がきまります。

- 加速

  パドルにボールが当たると、加速していきます。
  どちらかが得点を取ると、初期速度に戻ります。

- ゲーム終了後

  シングル、デュオモードはゲーム終了後、現在時刻が表示されます。キーを何か押すとゲームがリスタートされます。


## 操作方法
- `A` `W` `←`* `↑`* : 左または上に移動 ( * : デュオモードのみ )
- `D` `S` `→`* `↓`* : 右または下に移動 ( * : デュオモードのみ )
- `Space` `Enter`*　: サーブ発射 ( * : デュオモードのみ )
- `Q` `E` : カメラ切り替え ( シングルモードのみ )

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
- ~~ゲーム終了後の状態遷移~~ (2025/07/31完了)

- 個人設定の追加

  Cookieを使用し操作方法や、操作感度、ユーザ名などを設定可能にする。

- メニュー画面制作

  ゲームのモードを選択できるメニューを作成する。

- スマホでの操作

  スマホでの操作を可能にし、デバイス間の壁をなくす。

- ~~カメラの位置調整~~ (2025/08/14完了)

  いまのままだと、画面の幅が変わるとステージが見切れてしまうので画面の幅に応じて調整できるようにする。

- 衝突時の効果音

  壁やパドルの衝突時、[THREE.Audio](https://threejs.org/docs/#api/en/audio/Audio)を用いて効果音を鳴らす。

- マルチモード

  Node.jsでWebSocketを使用し、リアルタイム通信を可能とするとともに、ユーザに楽しい体験を提供できるようにしたいと思う。また、複数人は入れるようにし、観戦や観戦者がプレイヤーに邪魔できる機能などを追加したい。

## 質問について
質問は[こちら](https://github.com/RyOkEeeesh/pong/issues)から、`question`のラベルを付け、issueを作成してください。
また、デバック情報などがある場合も[こちら](https://github.com/RyOkEeeesh/pong/issues)からお願いします。

## 参考
- [ヒカキンさんの動画](https://youtu.be/sQFQPH5IL2Y?si=HVLRD1YNcXh95-Y8)
