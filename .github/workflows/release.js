
module.exports = async ({github, context, exec}) => {
  const fs = require('fs')
  const plist = require('plist')

  const pull_number = context.pull_number || context.payload.pull_request.number
  const { owner, repo } = context.repo
  const files = await github.rest.pulls.listFiles({ owner, repo, pull_number });
  const sourceRepo = await github.rest.pulls.get({ owner, repo, pull_number });

  //console.log(files.data)

  const dirs = [...new Set(files.data.map(d => d.filename.split('/')[1]).filter(d => d.indexOf('.eragesoundset') > -1))]
  //console.log(dirs)

  const json = JSON.parse(fs.readFileSync('./soundsets.json', 'utf-8'))

  const getZipName = dir => `${dir.replace(/[^a-z0-9-_\(\)\. ]/gi, '').trim().replaceAll(' ', '.')}.zip`

  for (const dir of dirs) {
    const plistFile = `./soundsets/${dir}/soundset.plist`
    const list = plist.parse(fs.readFileSync(plistFile, 'utf-8'))
    const name = dir.replace('.eragesoundset', '')
    const zipFileName = getZipName(dir)
    console.log(zipFileName)
    list.SoundSetDownloadURL = `https://github.com/${owner}/${repo}/releases/download/v${pull_number}/${zipFileName}`
    fs.writeFileSync(plistFile, plist.build(list), 'utf-8')

    const output = await exec.exec('zip', ['-r', zipFileName, dir], { cwd: './soundsets' })
    console.log(output)

    const downloadItem = {
      name,
      repo: sourceRepo.data.head.repo.html_url,
      description: list.SoundSetUserString,
      download: list.SoundSetDownloadURL,
      icon: list.SoundSetIconURL,
    }

    let found = false
    const updatedJson = json.map(item => {
      if (item.name == name && list.repo == sourceRepo.data.head.repo.html_url) {
        found = true
        return updatedJson
      }
    })
    if (!found) {
      json.push(downloadItem)
    }
  }

  const release = await github.rest.repos.createRelease({
    owner,
    repo,
    tag_name: `v${pull_number}`,
    name: `v${pull_number}`,
    body: `Bundles latest assets:\n\n ${dirs.map(d => `- ${d}`).join('\n')}`,
  });
  // console.log(release)

  let uploads = []
  
  for (const dir of dirs) {
    const zipFileName = getZipName(dir)

    uploads.push(github.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.data.id,
      name: zipFileName,
      data: fs.readFileSync(`soundsets/${zipFileName}`),
    }))
  }

  const status = await Promise.all(uploads)
  // console.log(status)

  const mainRelease = await github.rest.repos.getReleaseByTag({
    owner,
    repo,
    tag: 'soundsets.json',
  })

  const assets = await github.rest.repos.listReleaseAssets({
    owner,
    repo,
    release_id: mainRelease.data.id,
  })

  await github.rest.repos.deleteReleaseAsset({
    owner,
    repo,
    asset_id: assets.data[0].id,
  })

  const asset = await github.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: mainRelease.data.id,
    name: `soundsets.json`,
    data: JSON.stringify(json),
  })

  // const oldAsset = await github.rest.repos.getContent({
  //   owner,
  //   repo,
  //   path: `soundsets.json`,
  // });

  // const asset = await github.rest.repos.createOrUpdateFileContents({
  //   owner,
  //   repo,
  //   path: `soundsets.json`,
  //   message: 'Updated soundsets.json',
  //   content: Buffer.from(JSON.stringify(json)).toString('base64'),
  //   sha: oldAsset.data.sha,
  // });
  console.log(asset)
}