// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { base } from '../base';
import { colorFromString } from '../color';
import { Stage, Polygon } from '../interfaces';
import { Datum, Scene, SceneRect, SceneGroup, AreaMark } from 'vega-typings';
import { GroupType, MarkStager, MarkStagerOptions } from './interfaces';
import { min3dDepth } from '../defaults';

type SceneCube = SceneRect & {
    datum: Datum;
    depth: number;
    opacity: number;
    z: number;
}

type GroupItem = SceneGroup & {
    datum: Datum;
    length: number;
    depth: number;
    opacity: number;
    fill: string;
    z: number;
    z2: number;
    x2: number;
    y2: number;
}


const markStager: MarkStager = (options: MarkStagerOptions, stage: Stage, scene: Scene, x: number, y: number, groupType: GroupType) => {
 //   console.log("in area stager ", scene);


    //    base.vega.sceneVisit(scene, function (item: GroupItem) {

    //for orthographic (2d) - always use 0 or else Deck will not show them
    // const z = stage.view === '2d' ? 0 : (item.z || 0);
    // const depth = (stage.view === '2d' ? 0 : (item.depth || 0)) + min3dDepth;

    //change direction of y from SVG to GL
    const ty = -1;


    const g1 = scene.items[0] as GroupItem;

    const polygon: Polygon = {
        // strokeWidth: item.items[0].strokeWidth,
        strokeWidth: 2,
        strokeColor: colorFromString(g1.stroke),
        fillColor: colorFromString(g1.fill),
        strokeOpacity: 1.0,        
        positions: scene.items.map((it: GroupItem) => { return [it.x, -1 * it.y, 'z' in it ?it.z:0, 'x2' in it ?it.x2:it.x, 'y2' in it? -1 * it.y2: -1*it.y, 'z2' in it ?it.z2:('z' in it ? it.z:0)] })
        //positions: scene.items.map((it: GroupItem) => { return [it.x, it.y, 'z' in it ?it.z:0, 'x2' in it ?it.x2:it.x, 'y2' in it? it.y2: it.y, 'z2' in it ?it.z2:('z' in it ? it.z:0)] })
    };

    stage.polygonData.push(polygon);
    //});

    // console.log("end of  line stager ", stage);

};

export default markStager;