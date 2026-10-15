import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import { describe,it,vi,expect } from 'vitest';
import AirAdminForm from '../AirAdminForm';
const {mutate}=vi.hoisted(()=>({mutate:vi.fn().mockResolvedValue({updated:true})}));
vi.mock('@/hooks/useAirAdmin',()=>({useAirAdminActions:()=>({mutateAsync:mutate,isPending:false}),useAirAdminList:()=>({data:{items:[{id:'5e182c34-49f8-40d3-bf6c-88b576c20c45',name:'Trial plan',enabled:true},{id:'00000000-0000-4000-8000-000000000001',name:'Disabled plan',enabled:false}]}})}));
describe('Air access administration',()=>{
  it('keeps the current access state, lists enabled plans and requires an audit reason',async()=>{
    const id='5e182c34-49f8-40d3-bf6c-88b576c20c45',close=vi.fn();render(<AirAdminForm section="customers" row={{userId:id,planId:id,status:'suspended'}} onClose={close}/>);
    expect(screen.getByLabelText('Access status')).toHaveValue('suspended');expect(screen.getByRole('option',{name:'Trial plan'})).toBeInTheDocument();expect(screen.queryByRole('option',{name:'Disabled plan'})).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reason for audit history'),{target:{value:'Manual review completed'}});fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
    await waitFor(()=>expect(mutate).toHaveBeenCalledWith({kind:'grant',id,input:expect.objectContaining({status:'suspended',reason:'Manual review completed'})}));expect(close).toHaveBeenCalled();
  });
});
