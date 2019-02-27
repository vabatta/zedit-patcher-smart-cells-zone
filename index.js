/* global info, xelib, registerPatcher, patcherUrl */

registerPatcher({
  info: info,
  gameModes: [xelib.gmSSE, xelib.gmTES5],
  settings: {
    label: info.name,
    hide: false,
    templateUrl: `${patcherUrl}/partials/settings.html`,
    defaultSettings: {
      title: info.name,
      patchFileName: 'Smart Patch.esp'
    }
  },
  // requiredFiles: [''],
  getFilesToPatch: filenames => {
    return filenames
  },
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: () => {
      // initialize
      // measure the execution time
      locals.start = new Date()
      // get all encounter zones records
      locals.ECZNs = helpers.loadRecords('ECZN')
        // and sort them alphabetically for binary search
        .sort((a, b) => {
          // sort alphabetically
          a = xelib.EditorID(a)
          b = xelib.EditorID(b)
          // compare and return
          if (a > b) return 1
          else if (a < b) return -1
          else return 0
        })
      // get all locations records
      locals.LCTNs = helpers.loadRecords('LCTN')
        // and sort them alphabetically for binary search
        .sort((a, b) => {
          // sort alphabetically
          a = xelib.EditorID(a)
          b = xelib.EditorID(b)
          // compare and return
          if (a > b) return 1
          else if (a < b) return -1
          else return 0
        })
    },
    process: [{
      load: {
        signature: 'CELL',
        filter: record => {
          // get the winning override which has a location but not an encounter zone setting
          return xelib.IsWinningOverride(record) && xelib.HasElement(record, 'XLCN') && !xelib.HasElement(record, 'XEZN')
        }
      },
      patch: record => {
        // get the cell EDID
        const cellEDID = xelib.EditorID(record)
        // get the location reference
        const location = xelib.GetLinksTo(record, 'XLCN')

        // binary search through all zones
        let startIndex = 0
        let stopIndex = locals.ECZNs.length - 1
        // iterate until we need to stop
        while (startIndex <= stopIndex) {
          let currentIndex = (stopIndex + startIndex) >> 1
          // get the zone
          const zone = xelib.GetWinningOverride(locals.ECZNs[currentIndex])

          // assign by location reference
          if (xelib.HasElement(zone, 'DATA\\Location') && xelib.GetLinksTo(zone, 'DATA\\Location') !== 0) {
            const zoneFormID = xelib.GetFormID(xelib.GetLinksTo(zone, 'DATA\\Location'))
            // check that the location are the same
            if (zoneFormID === xelib.GetFormID(location)) {
              // found a zone that matches the location reference of the zone and the cell
              // helpers.logMessage(`=> found ${xelib.EditorID(zone)}`)
              // patch it
              xelib.AddElement(record, 'XEZN')
              xelib.SetLinksTo(record, zone, 'XEZN')
              // exit the loop
              break
            }
          }

          // assign by pattern matching
          // strip out 'Zone' from the zone editor ID as it is not needed to match
          let zoneEDID = xelib.EditorID(zone).replace('Zone', '')
          // assumption: if it's an interior cell, we can strip out also 'Interior'
          if (xelib.GetFlag(record, 'DATA', 'Is Interior Cell')) zoneEDID = zoneEDID.replace('Interior', '')
          // longest common starting substring between cell EDID and zone EDID
          let k = 0
          while (k < zoneEDID.length && zoneEDID.charAt(k) === cellEDID.charAt(k)) k++
          // check if the zone is completely consumed
          if (k === zoneEDID.length) {
            // found a zone that matches the cell
            // helpers.logMessage(`=> found ${xelib.EditorID(zone)}`)
            // patch it
            xelib.AddElement(record, 'XEZN')
            xelib.SetLinksTo(record, zone, 'XEZN')
            // exit the loop
            break
          }

          // lookup for a possible next zone
          if (cellEDID > zoneEDID) startIndex = currentIndex + 1
          else if (cellEDID < zoneEDID) stopIndex = currentIndex - 1
          // there won't be a zone for this edid
          else break
        }
      }
    }],
    finalize: () => {
      // log the execution time
      locals.time = new Date() - locals.start
      helpers.logMessage(`Took ${locals.time / 1000} seconds`)
    }
  })
})
