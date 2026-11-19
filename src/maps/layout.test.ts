import {describe,it,expect,vi,afterEach} from 'vitest';
import {mapBottomInset} from './layout';
function rect(x:number,y:number,width:number,height:number){return {x,y,width,height,left:x,top:y,right:x+width,bottom:y+height} as DOMRect;}
function setup(mobile:boolean,sheet:DOMRect,radar:DOMRect){
 vi.stubGlobal('matchMedia',()=>({matches:mobile}));
 const workspace=document.createElement('main');workspace.className='workspace';
 const host=document.createElement('div');workspace.append(host);
 const panel=document.createElement('aside');panel.className='situation-panel';workspace.append(panel);
 const dock=document.createElement('div');dock.className='radar-controls';workspace.append(dock);
 vi.spyOn(host,'getBoundingClientRect').mockReturnValue(rect(280,48,560,330));
 Object.defineProperty(host,'clientHeight',{value:330});
 vi.spyOn(panel,'getBoundingClientRect').mockReturnValue(sheet);
 vi.spyOn(dock,'getBoundingClientRect').mockReturnValue(radar);
 return host;
}
afterEach(()=>vi.unstubAllGlobals());
describe('camera padding follows actual mobile overlay geometry',()=>{
 it('excludes the landscape side rail',()=>expect(mapBottomInset(setup(true,rect(8,166,260,212),rect(288,282,544,64)))).toBe(104));
 it('accounts for a wrapped radar status',()=>expect(mapBottomInset(setup(true,rect(8,166,260,212),rect(288,266,544,80)))).toBe(120));
 it('uses the overlapping portrait sheet when radar is hidden',()=>expect(mapBottomInset(setup(true,rect(280,280,560,98),rect(0,0,0,0)))).toBe(106));
 it('does not add padding for a side rail with radar hidden',()=>expect(mapBottomInset(setup(true,rect(8,166,260,212),rect(0,0,0,0)))).toBe(0));
 it('preserves desktop camera policy',()=>expect(mapBottomInset(setup(false,rect(280,280,560,98),rect(288,282,544,64)))).toBe(0));
});
